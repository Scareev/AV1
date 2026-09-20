import assert from "node:assert/strict";
import { test } from "node:test";
import CriptografiaArquivo from "../infra/CriptografiaArquivo";
import ValidadorCNPJ from "../infra/validadores/ValidadorCNPJ";
import ValidadorDataEntrada from "../infra/validadores/ValidadorDataEntrada";
import ServicoAutenticacao from "../services/ServicoAutenticacao";
import PapelUsuario from "../domain/enums/PapelUsuario";
import Sessao from "../domain/Sessao";
import fs from "node:fs";
import Contrato from "../domain/Contrato";
import Equipamento from "../domain/Equipamento";
import Movimentacao from "../domain/Movimentacao";
import TipoEquipamento from "../domain/enums/TipoEquipamento";
import EstadoFisico from "../domain/enums/EstadoFisico";
import StatusRastreamento from "../domain/enums/StatusRastreamento";
import RepositorioArquivo from "../infra/RepositorioArquivo";
import ServicoEquipamento from "../services/ServicoEquipamento";
import ServicoLote from "../services/ServicoLote";
import ServicoOrganizacao from "../services/ServicoOrganizacao";
import ServicoProvisionamento from "../services/ServicoProvisionamento";
import JournalTransacao from "../auditoria/JornalTransacao";

test("valida CNPJ com dígitos verificadores", () => {
    const validador = new ValidadorCNPJ();
    assert.equal(validador.validar("11.222.333/0001-81"), true);
    assert.equal(validador.validar("11.222.333/0001-82"), false);
});

test("rejeita data futura e aceita data recente", () => {
    const validador = new ValidadorDataEntrada();
    assert.equal(validador.validar(new Date(Date.now() + 86400000)), false);
    assert.equal(validador.validar(new Date()), true);
});

test("cifra e decifra dados com AES-256-GCM", () => {
    const criptografia = new CriptografiaArquivo();
    const chave = criptografia.gerarChave();
    const cifrado = criptografia.cifrar("dados de teste", chave);
    assert.equal(criptografia.decifrar(cifrado, chave), "dados de teste");
});

test("rejeita conteúdo criptografado adulterado", () => {
    const criptografia = new CriptografiaArquivo();
    const chave = criptografia.gerarChave();
    const cifrado = criptografia.cifrar("dados protegidos", chave);
    const partes = cifrado.split(":");
    const conteudo = partes[2] ?? "";
    const primeiroCaractere = conteudo[0] === "A" ? "B" : "A";
    const conteudoAdulterado = `${primeiroCaractere}${conteudo.slice(1)}`;
    const adulterado = `${partes[0]}:${partes[1]}:${conteudoAdulterado}`;
    assert.throws(() => criptografia.decifrar(adulterado, chave));
});

test("protege o diretório e exige chave AES-256 válida", () => {
    const criptografia = new CriptografiaArquivo();
    const repositorio = new RepositorioArquivo("./tmp-repositorio-teste", criptografia);
    assert.throws(() => repositorio.salvar("../fora.json", { teste: true }));
    assert.throws(() => criptografia.cifrar("dados", "chave-invalida"));
    fs.rmSync("./tmp-repositorio-teste", { recursive: true, force: true });
});

test("autentica usuário e invalida sessão após logout", () => {
    const autenticacao = new ServicoAutenticacao([], []);
    autenticacao.criarCredencial("admin", "senha", PapelUsuario.ADMINISTRADOR);
    const sessao = autenticacao.login("admin", "senha");
    assert.equal(autenticacao.validarToken(sessao.obterToken()), true);
    autenticacao.logout(sessao.obterToken());
    assert.equal(autenticacao.validarToken(sessao.obterToken()), false);
});

test("rejeita sessão expirada", () => {
    const sessao = new Sessao("expirada", "admin", PapelUsuario.ADMINISTRADOR, new Date(0), new Date(1));
    const autenticacao = new ServicoAutenticacao([], [sessao]);
    assert.equal(autenticacao.validarToken("expirada"), false);
});

test("aplica permissões conforme o papel", () => {
    const autenticacao = new ServicoAutenticacao([], []);
    assert.equal(autenticacao.podeExecutar(PapelUsuario.ADMINISTRADOR, "auditoria"), true);
    assert.equal(autenticacao.podeExecutar(PapelUsuario.AUDITOR, "lote"), false);
});

test("executa jornada operacional básica", () => {
    const diretorio = "./tmp-jornada-teste";
    if (fs.existsSync(diretorio)) {
        fs.rmSync(diretorio, { recursive: true, force: true });
    }

    const criptografia = new CriptografiaArquivo();
    const repositorio = new RepositorioArquivo(diretorio, criptografia);
    const autenticacao = new ServicoAutenticacao([], []);
    const provisionamento = new ServicoProvisionamento(repositorio, criptografia, autenticacao);
    assert.equal(provisionamento.provisionar("admin", "senha"), true);
    assert.ok(autenticacao.login("admin", "senha"));

    const contrato = new Contrato("CTR1", "ORG1", new Date(), new Date("2027-01-01"), [], 100, true);
    const organizacao = new ServicoOrganizacao(repositorio, new ValidadorCNPJ());
    organizacao.cadastrarOrganizacao({
        id: "ORG1",
        razaoSocial: "Empresa Teste",
        cnpj: "11.222.333/0001-81",
        contratoVigente: contrato
    });
    assert.throws(() => organizacao.cadastrarOrganizacao({
        id: "ORG2",
        razaoSocial: "Empresa Duplicada",
        cnpj: "11222333000181",
        contratoVigente: contrato
    }));

    const lotes = new ServicoLote(repositorio);
    lotes.criarLote({ id: "LOTE1", organizacaoId: "ORG1", notaFiscal: "NF1", transportadora: "T1" });
    assert.throws(() => lotes.criarLote({ id: "LOTE2", organizacaoId: "ORG1", notaFiscal: "NF2", transportadora: "T1", dataEntrada: new Date(Date.now() - 91 * 86400000) }));
    const equipamento = new Equipamento("EQ1", "COD1", TipoEquipamento.NOTEBOOK, "Marca", "Modelo", 2024, EstadoFisico.BOM_ESTADO, 1, "LOTE1", 1, StatusRastreamento.AGUARDANDO_TRIAGEM, []);
    const equipamentos = new ServicoEquipamento(repositorio);
    equipamentos.cadastrarEquipamento(equipamento);
    assert.throws(() => equipamentos.atualizarEstadoFisico("EQ1", EstadoFisico.INSERVIVEL));
    equipamentos.atualizarEstadoFisico("EQ1", EstadoFisico.INSERVIVEL, "Dano irreparável");
    assert.throws(() => equipamentos.registrarMovimentacao("EQ1", new Movimentacao("M1", "EQ1", new Date(), "A", "Desmonte", "admin", "teste")));
    equipamentos.concluirTriagem("EQ1");
    equipamentos.registrarMovimentacao("EQ1", new Movimentacao("M2", "EQ1", new Date(), "A", "Desmonte", "admin", "teste"));
    assert.equal(equipamentos.rastrearEquipamento("EQ1").length, 1);

    fs.rmSync(diretorio, { recursive: true, force: true });
});

test("mantém retenção e rotaciona journal acima de 10 MB", () => {
    const diretorio = "./tmp-journal-teste";
    if (fs.existsSync(diretorio)) {
        fs.rmSync(diretorio, { recursive: true, force: true });
    }

    const criptografia = new CriptografiaArquivo();
    const repositorio = new RepositorioArquivo(diretorio, criptografia);
    repositorio.definirChave(criptografia.gerarChave());
    repositorio.salvar("journal.json", [{
        id: "antigo",
        timestamp: new Date(Date.now() - 181 * 86400000).toISOString()
    }]);

    const dadosGrandes = "x".repeat(10 * 1024 * 1024);
    new JournalTransacao("novo", new Date(), "TESTE", "Equipamento", {}, { dadosGrandes }, "admin", repositorio).registrar();
    const arquivos = repositorio.listar();
    assert.ok(arquivos.some(arquivo => arquivo.startsWith("journal-") && arquivo.endsWith(".json")));

    fs.rmSync(diretorio, { recursive: true, force: true });
});

test("persiste sessão entre reinicializações", () => {
    const diretorio = "./tmp-sessao-teste";
    if (fs.existsSync(diretorio)) {
        fs.rmSync(diretorio, { recursive: true, force: true });
    }

    const criptografia = new CriptografiaArquivo();
    const repositorio = new RepositorioArquivo(diretorio, criptografia);
    let persistir = (): void => undefined;
    const autenticacao = new ServicoAutenticacao([], [], () => persistir());
    const provisionamento = new ServicoProvisionamento(repositorio, criptografia, autenticacao);
    provisionamento.provisionar("admin", "senha");
    persistir = () => repositorio.salvar("sessoes.json", autenticacao.listarSessoes());
    const sessao = autenticacao.login("admin", "senha");

    const novaAutenticacao = new ServicoAutenticacao([], []);
    const novoProvisionamento = new ServicoProvisionamento(repositorio, criptografia, novaAutenticacao);
    assert.equal(novoProvisionamento.inicializar(), true);
    assert.equal(novaAutenticacao.validarToken(sessao.obterToken()), true);
    const sessoesPersistidas = repositorio.ler<any[]>("sessoes.json");
    assert.ok(new Date(sessoesPersistidas[0].expiracao).getTime() > Date.now());

    fs.rmSync(diretorio, { recursive: true, force: true });
});

test("executa reversão registrada no journal", () => {
    let estado = "depois";
    const journal = new JournalTransacao(
        "reversao-1",
        new Date(),
        "ALTERAR",
        "Equipamento",
        { estado: "antes" },
        { estado },
        "admin",
        undefined,
        () => { estado = "antes"; }
    );

    assert.equal(journal.reverter(), true);
    assert.equal(estado, "antes");
});
