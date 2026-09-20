import Validador from "./Validador";

export default class ValidadorDataEntrada extends Validador {
    private mensagemErro = "";

    validar(data: Date): boolean {
        if (!(data instanceof Date) || Number.isNaN(data.getTime())) {
            this.mensagemErro = "A data de entrada é inválida.";
            return false;
        }

        const agora = new Date();
        const limiteInferior = new Date(agora);
        limiteInferior.setDate(limiteInferior.getDate() - 90);

        if (data > agora) {
            this.mensagemErro = "A data de entrada não pode ser futura.";
            return false;
        }

        if (data < limiteInferior) {
            this.mensagemErro = "A data de entrada não pode ser anterior a 90 dias.";
            return false;
        }

        this.mensagemErro = "";
        return true;
    }

    obterMensagemErro(): string {
        return this.mensagemErro;
    }
}