import { createHash, randomBytes } from "node:crypto";
import Credencial from "../domain/Credencial";
import Sessao from "../domain/Sessao";
import PapelUsuario from "../domain/enums/PapelUsuario";

export default class ServicoAutenticacao {
    constructor(
        private credenciais: Credencial[],
        private sessoesAtivas: Sessao[],
        private persistir?: () => void
    ) {}

    login(usuario: string, senha: string): Sessao {
        const credencial = this.credenciais.find(item => item.obterUsuario() === usuario);
        if (credencial === undefined || !this.verificarSenha(senha, credencial)) {
            throw new Error("Usuário ou senha inválidos.");
        }

        const agora = new Date();
        credencial.registrarAcesso(agora);
        const sessao = new Sessao(
            randomBytes(32).toString("hex"),
            usuario,
            credencial.obterPapel(),
            agora,
            new Date(agora.getTime() + 30 * 60 * 1000)
        );
        this.sessoesAtivas.push(sessao);
        this.persistir?.();
        return sessao;
    }

    logout(token: string): void {
        this.sessoesAtivas = this.sessoesAtivas.filter(item => item.obterToken() !== token);
        this.persistir?.();
    }

    validarToken(token: string): boolean {
        const sessao = this.sessoesAtivas.find(item => item.obterToken() === token);
        if (sessao === undefined || sessao.estaExpirada()) {
            if (sessao !== undefined) {
                this.logout(token);
            }
            return false;
        }

        sessao.renovar();
        this.persistir?.();
        return true;
    }

    alterarSenha(
        usuario: string,
        senhaAntiga: string,
        senhaNova: string
    ): boolean {
        const credencial = this.credenciais.find(item => item.obterUsuario() === usuario);
        if (credencial === undefined || !this.verificarSenha(senhaAntiga, credencial)) {
            return false;
        }

        const salt = randomBytes(16).toString("hex");
        credencial.atualizarSenha(this.gerarHash(senhaNova, salt), salt);
        this.persistir?.();
        return true;
    }

    criarCredencial(usuario: string, senha: string, papel: PapelUsuario): Credencial {
        if (this.credenciais.some(item => item.obterUsuario() === usuario)) {
            throw new Error("Usuário já cadastrado.");
        }

        const salt = randomBytes(16).toString("hex");
        const credencial = new Credencial(
            usuario,
            this.gerarHash(senha, salt),
            salt,
            new Date(0),
            papel
        );
        this.credenciais.push(credencial);
        this.persistir?.();
        return credencial;
    }

    obterSessao(token: string): Sessao | undefined {
        return this.sessoesAtivas.find(item => item.obterToken() === token);
    }

    listarCredenciais(): Credencial[] {
        return [...this.credenciais];
    }

    carregarCredenciais(credenciais: Credencial[]): void {
        this.credenciais = credenciais;
    }

    listarSessoes(): Sessao[] {
        return [...this.sessoesAtivas];
    }

    carregarSessoes(sessoes: Sessao[]): void {
        this.sessoesAtivas = sessoes;
    }

    podeExecutar(papel: PapelUsuario, operacao: string): boolean {
        const permissoes: Record<PapelUsuario, string[]> = {
            [PapelUsuario.ADMINISTRADOR]: ["organizacao", "lote", "equipamento", "relatorio", "auditoria"],
            [PapelUsuario.OPERADOR_CADASTRO]: ["organizacao", "lote", "equipamento"],
            [PapelUsuario.GESTOR_ALMOXARIFADO]: ["lote", "equipamento", "rastreabilidade"],
            [PapelUsuario.AUDITOR]: ["rastreabilidade", "relatorio", "auditoria"]
        };

        return permissoes[papel]?.includes(operacao) ?? false;
    }

    private verificarSenha(senha: string, credencial: Credencial): boolean {
        return this.gerarHash(senha, credencial.obterSalt()) === credencial.obterHashSenha();
    }

    private gerarHash(senha: string, salt: string): string {
        return createHash("sha256")
            .update(`${salt}${senha}`, "utf8")
            .digest("hex");
    }
}