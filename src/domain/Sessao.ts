import PapelUsuario from "./enums/PapelUsuario";

export default class Sessao {
    constructor(
        private token: string,
        private usuario: string,
        private papel: PapelUsuario,
        private criacao: Date,
        private expiracao: Date
    ) {}

    obterToken(): string {
        return this.token;
    }

    obterUsuario(): string {
        return this.usuario;
    }

    obterPapel(): PapelUsuario {
        return this.papel;
    }

    estaExpirada(agora: Date = new Date()): boolean {
        return agora >= this.expiracao;
    }

    renovar(agora: Date = new Date()): void {
        this.expiracao = new Date(agora.getTime() + 30 * 60 * 1000);
    }
}