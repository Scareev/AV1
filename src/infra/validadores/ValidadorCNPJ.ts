import Validador from "./Validador";

export default class ValidadorCNPJ extends Validador {
    private mensagemErro = "";

    validar(cnpj: string): boolean {
        const numeros = cnpj.replace(/\D/g, "");

        if (numeros.length !== 14 || /^([0-9])\1{13}$/.test(numeros)) {
            this.mensagemErro = "O CNPJ deve conter 14 dígitos válidos.";
            return false;
        }

        const primeiroDigito = this.calcularDigito(numeros.substring(0, 12));
        const segundoDigito = this.calcularDigito(numeros.substring(0, 12) + primeiroDigito);
        const valido = numeros === numeros.substring(0, 12) + primeiroDigito + segundoDigito;

        this.mensagemErro = valido ? "" : "Os dígitos verificadores do CNPJ são inválidos.";
        return valido;
    }

    obterMensagemErro(): string {
        return this.mensagemErro;
    }

    private calcularDigito(base: string): number {
        const pesos = base.length === 12
            ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
            : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const soma = base
            .split("")
            .reduce((total, digito, indice) => total + Number(digito) * (pesos[indice] ?? 0), 0);
        const resto = soma % 11;

        return resto < 2 ? 0 : 11 - resto;
    }
}