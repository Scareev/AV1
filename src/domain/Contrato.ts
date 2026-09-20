export default class Contrato {
    constructor(
        private readonly id: string,
        public readonly organizacaoId: string,
        public readonly dataAssinatura: Date,
        public dataVencimento: Date,
        public clausulas: string[],
        public valorMensal: number,
        public renovacaoAutomatica: boolean
    ) {}
}