export default abstract class Validador {
    abstract validar(objeto: any): boolean;
    abstract obterMensagemErro(): string;
}