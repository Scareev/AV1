import { createInterface } from "node:readline/promises";
import { stdin as entrada, stdout as saida } from "node:process";

import CLIInterface from "./cli/CLIInterface";
import CriptografiaArquivo from "./infra/CriptografiaArquivo";
import RepositorioArquivo from "./infra/RepositorioArquivo";
import ValidadorCNPJ from "./infra/validadores/ValidadorCNPJ";
import ServicoAutenticacao from "./services/ServicoAutenticacao";
import ServicoEquipamento from "./services/ServicoEquipamento";
import ServicoLote from "./services/ServicoLote";
import ServicoOrganizacao from "./services/ServicoOrganizacao";
import ServicoProvisionamento from "./services/ServicoProvisionamento";
import ServicoRelatorio from "./services/ServicoRelatorio";

async function iniciarAplicacao(): Promise<void> {
    const criptografia = new CriptografiaArquivo();
    const repositorio = new RepositorioArquivo("./dados", criptografia);
    let persistirSessoes: () => void = () => undefined;
    const autenticacao = new ServicoAutenticacao([], [], () => persistirSessoes());
    const provisionamento = new ServicoProvisionamento(
        repositorio,
        criptografia,
        autenticacao
    );

    if (!provisionamento.inicializar()) {
        const leitor = createInterface({ input: entrada, output: saida });
        console.log("Configuração inicial não encontrada.");
        const usuario = await leitor.question("Primeiro administrador: ");
        const senha = await leitor.question("Senha: ");
        leitor.close();

        if (usuario.trim() === "" || senha.length === 0) {
            throw new Error("Usuário e senha são obrigatórios.");
        }

        provisionamento.provisionar(usuario.trim(), senha);
        console.log("Provisionamento concluído.");
    }

    persistirSessoes = () => repositorio.salvar("sessoes.json", autenticacao.listarSessoes());

    const servicoOrganizacao = new ServicoOrganizacao(
        repositorio,
        new ValidadorCNPJ()
    );
    const servicoLote = new ServicoLote(repositorio);
    const servicoEquipamento = new ServicoEquipamento(repositorio);
    const servicoRelatorio = new ServicoRelatorio(repositorio);
    const cli = new CLIInterface(
        autenticacao,
        servicoOrganizacao,
        servicoLote,
        servicoEquipamento,
        servicoRelatorio,
        null
    );

    console.log("Sistema iniciado. Use 'ajuda' para ver os comandos.");
    cli.iniciarLoop();
}

iniciarAplicacao().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : "Falha ao iniciar o sistema.");
    process.exitCode = 1;
});
