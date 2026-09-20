import * as readline from "node:readline";
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import Contrato from "../domain/Contrato";
import Equipamento from "../domain/Equipamento";
import ServicoAutenticacao from "../services/ServicoAutenticacao";
import ServicoOrganizacao from "../services/ServicoOrganizacao";
import ServicoLote from "../services/ServicoLote";
import ServicoEquipamento from "../services/ServicoEquipamento";
import ServicoRelatorio from "../services/ServicoRelatorio";
import Sessao from "../domain/Sessao";
import PapelUsuario from "../domain/enums/PapelUsuario";
import StatusRastreamento from "../domain/enums/StatusRastreamento";
import TipoEquipamento from "../domain/enums/TipoEquipamento";
import EstadoFisico from "../domain/enums/EstadoFisico";

export default class CLIInterface {
    constructor(
        private autenticacao: ServicoAutenticacao,
        private organizacao: ServicoOrganizacao,
        private lote: ServicoLote,
        private equipamento: ServicoEquipamento,
        private relatorio: ServicoRelatorio,
        private sessaoAtual: Sessao | null,
        private historicoPath = "./dados/historico.txt"
    ) {}

    iniciarLoop(): void {
        const comandos = [
            "ajuda",
            "login",
            "logout",
            "menu",
            "organizacao",
            "lote",
            "equipamento",
            "relatorio",
            "sair"
        ];
        const interfaceLinha = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            historySize: 100,
            completer: (linha: string) => {
                const candidatos = comandos.filter(comando => comando.startsWith(linha));
                return [candidatos.length > 0 ? candidatos : comandos, linha];
            }
        });

        if (existsSync(this.historicoPath)) {
            const interfaceComHistorico = interfaceLinha as readline.Interface & { history: string[] };
            interfaceComHistorico.history = readFileSync(this.historicoPath, "utf8")
                .split("\n")
                .filter(Boolean)
                .reverse();
        }

        interfaceLinha.setPrompt("greencode> ");
        interfaceLinha.prompt();
        interfaceLinha.on("line", entrada => {
            this.persistirHistorico(entrada);
            if (entrada.trim().toLowerCase() === "sair") {
                interfaceLinha.close();
                return;
            }

            this.processarComando(entrada);
            interfaceLinha.prompt();
        });
    }

    processarComando(entrada: string): void {
        const partes = entrada.trim().split(/\s+/).filter(Boolean);
        const comando = partes[0]?.toLowerCase();
        if (comando === undefined) {
            return;
        }

        if (comando === "ajuda") {
            console.log(`
Comandos disponíveis:

  login <usuário> <senha>
      Autentica um usuário.
      Exemplo: login admin minha-senha

  logout
      Encerra a sessão atual.

  menu
      Exibe as operações permitidas para o papel autenticado.

  organizacao listar
      Lista as organizações ativas.

  organizacao criar --id ID --razao NOME --cnpj CNPJ
      Cadastra uma organização.
      Exemplo: organizacao criar --id ORG1 --razao EmpresaTeste --cnpj 11222333000181

  lote criar --id ID --org ORG --nf NOTA --transp TRANSPORTADORA
      Cria um lote para uma organização.
      Exemplo: lote criar --id LOTE1 --org ORG1 --nf NF1 --transp Transportadora

  lote consultar [início] [fim]
      Consulta lotes por período usando datas ISO.
      Exemplo: lote consultar 2026-01-01 2026-12-31

  equipamento cadastrar --id ID --lote LOTE
      Cadastra um equipamento associado a um lote.
      Exemplo: equipamento cadastrar --id EQ1 --lote LOTE1

  equipamento triagem <id>
      Conclui a triagem de um equipamento.
      Exemplo: equipamento triagem EQ1

  equipamento rastrear <id>
      Consulta o histórico de movimentações.
      Exemplo: equipamento rastrear EQ1

  relatorio status <código>
      Lista equipamentos por status de rastreamento.
      Códigos: 0 aguardando triagem, 1 em triagem, 2 aguardando desmonte,
      3 em desmonte, 4 peças reaproveitadas, 5 material reciclável,
      6 descarte seguro, 7 baixa definitiva.
      Exemplo: relatorio status 0

  ajuda
      Exibe esta lista.

  sair
      Encerra a aplicação.
`);
            return;
        }

        if (comando === "login") {
            const usuario = partes[1];
            const senha = partes[2];
            if (usuario === undefined || senha === undefined) {
                console.error("Uso: login <usuário> <senha>");
                return;
            }

            try {
                this.sessaoAtual = this.autenticacao.login(usuario, senha);
                console.log("Login realizado com sucesso.");
                this.exibirMenuPorPapel(this.sessaoAtual.obterPapel());
            } catch (erro) {
                console.error(erro instanceof Error ? erro.message : "Falha no login.");
            }
            return;
        }

        if (comando === "logout") {
            if (this.sessaoAtual === null) {
                console.error("Não há sessão ativa.");
                return;
            }

            this.autenticacao.logout(this.sessaoAtual.obterToken());
            this.sessaoAtual = null;
            console.log("Logout realizado com sucesso.");
            return;
        }

        if (comando === "menu") {
            if (this.sessaoAtual === null || !this.autenticacao.validarToken(this.sessaoAtual.obterToken())) {
                console.error("É necessário estar autenticado.");
                return;
            }

            this.exibirMenuPorPapel(this.sessaoAtual.obterPapel());
            return;
        }

        if (comando === "organizacao" && partes[1] === "listar") {
            if (!this.autorizar("organizacao")) {
                return;
            }

            console.log(this.organizacao.listarOrganizacoesAtivas());
            return;
        }

        if (comando === "organizacao" && partes[1] === "criar") {
            if (!this.autorizar("organizacao")) {
                return;
            }

            const id = this.obterOpcao(partes, "--id");
            const razaoSocial = this.obterOpcao(partes, "--razao");
            const cnpj = this.obterOpcao(partes, "--cnpj");
            if (id === undefined || razaoSocial === undefined || cnpj === undefined) {
                console.error("Uso: organizacao criar --id ID --razao NOME --cnpj CNPJ");
                return;
            }

            try {
                const contrato = new Contrato(`CTR-${id}`, id, new Date(), new Date("2099-12-31"), [], 0, false);
                const organizacao = this.organizacao.cadastrarOrganizacao({ id, razaoSocial, cnpj, contratoVigente: contrato });
                console.log("Organização criada:", organizacao);
            } catch (erro) {
                console.error(erro instanceof Error ? erro.message : "Falha ao criar organização.");
            }
            return;
        }

        if (comando === "lote" && partes[1] === "criar") {
            if (!this.autorizar("lote")) {
                return;
            }

            const id = this.obterOpcao(partes, "--id");
            const organizacaoId = this.obterOpcao(partes, "--org");
            const notaFiscal = this.obterOpcao(partes, "--nf");
            const transportadora = this.obterOpcao(partes, "--transp");
            if (id === undefined || organizacaoId === undefined || notaFiscal === undefined || transportadora === undefined) {
                console.error("Uso: lote criar --id ID --org ORG --nf NOTA --transp TRANSPORTADORA");
                return;
            }

            try {
                const lote = this.lote.criarLote({ id, organizacaoId, notaFiscal, transportadora });
                console.log("Lote criado:", lote);
            } catch (erro) {
                console.error(erro instanceof Error ? erro.message : "Falha ao criar lote.");
            }
            return;
        }

        if (comando === "equipamento" && partes[1] === "cadastrar") {
            if (!this.autorizar("equipamento")) {
                return;
            }

            const id = this.obterOpcao(partes, "--id");
            const loteId = this.obterOpcao(partes, "--lote");
            if (id === undefined || loteId === undefined) {
                console.error("Uso: equipamento cadastrar --id ID --lote LOTE");
                return;
            }

            const equipamento = new Equipamento(id, id, TipoEquipamento.NOTEBOOK, "Não informado", "Não informado", new Date().getFullYear(), EstadoFisico.NOVO, 0, loteId, 1, StatusRastreamento.AGUARDANDO_TRIAGEM, []);
            this.equipamento.cadastrarEquipamento(equipamento);
            console.log("Equipamento cadastrado:", id);
            return;
        }

        if (comando === "equipamento" && partes[1] === "triagem") {
            if (!this.autorizar("equipamento")) {
                return;
            }

            const id = partes[2];
            if (id === undefined) {
                console.error("Uso: equipamento triagem <id>");
                return;
            }

            this.equipamento.concluirTriagem(id);
            console.log("Triagem concluída:", id);
            return;
        }

        if (comando === "lote" && partes[1] === "consultar") {
            if (!this.autorizar("lote")) {
                return;
            }

            const inicio = partes[2] === undefined ? new Date(0) : new Date(partes[2]);
            const fim = partes[3] === undefined ? new Date() : new Date(partes[3]);
            if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
                console.error("Datas inválidas. Uso: lote consultar [início] [fim]");
                return;
            }

            console.log(this.lote.consultarLotePorPeriodo(inicio, fim));
            return;
        }

        if (comando === "equipamento" && partes[1] === "rastrear") {
            if (!this.autorizar("rastreabilidade")) {
                return;
            }

            const id = partes[2];
            if (id === undefined) {
                console.error("Uso: equipamento rastrear <id>");
                return;
            }

            console.log(this.equipamento.rastrearEquipamento(id));
            return;
        }

        if (comando === "relatorio" && partes[1] === "status") {
            if (!this.autorizar("relatorio")) {
                return;
            }

            const status = Number(partes[2]);
            if (!Number.isInteger(status) || StatusRastreamento[status] === undefined) {
                console.error("Uso: relatorio status <código do status>");
                return;
            }

            console.log(this.relatorio.gerarRelatorioPorStatus(status));
            return;
        }

        console.error("Comando desconhecido. Use 'ajuda'.");
    }

    exibirMenuPorPapel(papel: PapelUsuario): void {
        const menus: Record<PapelUsuario, string> = {
            [PapelUsuario.ADMINISTRADOR]: "organização, lote, equipamento, relatórios e auditoria",
            [PapelUsuario.OPERADOR_CADASTRO]: "organização, lote e equipamento",
            [PapelUsuario.GESTOR_ALMOXARIFADO]: "lote, equipamento e rastreabilidade",
            [PapelUsuario.AUDITOR]: "rastreabilidade, relatórios e auditoria"
        };
        console.log(`Menu disponível: ${menus[papel]}`);
    }

    private autorizar(operacao: string): boolean {
        if (this.sessaoAtual === null || !this.autenticacao.validarToken(this.sessaoAtual.obterToken())) {
            console.error("É necessário estar autenticado.");
            return false;
        }

        if (!this.autenticacao.podeExecutar(this.sessaoAtual.obterPapel(), operacao)) {
            console.error("Usuário sem permissão para esta operação.");
            return false;
        }

        return true;
    }

    private obterOpcao(partes: string[], nome: string): string | undefined {
        const indice = partes.indexOf(nome);
        return indice >= 0 ? partes[indice + 1] : undefined;
    }

    private persistirHistorico(entrada: string): void {
        const comando = entrada.trim();
        if (comando === "" || comando.toLowerCase().startsWith("login ")) {
            return;
        }

        appendFileSync(this.historicoPath, `${comando}\n`, "utf8");
    }
}