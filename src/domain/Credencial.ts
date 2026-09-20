import PapelUsuario from "./enums/PapelUsuario";

export default class Credencial {
    constructor(
        private usuario: string,
        private hashSenha: string,
        private salt: string,
        private ultimoAcesso: Date,
        private papel: PapelUsuario
    ) {}

    obterUsuario(): string {
        return this.usuario;
    }

    obterHashSenha(): string {
        return this.hashSenha;
    }

    obterSalt(): string {
        return this.salt;
    }

    obterPapel(): PapelUsuario {
        return this.papel;
    }

    atualizarSenha(hashSenha: string, salt: string): void {
        this.hashSenha = hashSenha;
        this.salt = salt;
    }

    registrarAcesso(data: Date): void {
        this.ultimoAcesso = data;
    }
}