export default class Movimentacao{
    constructor(
        private readonly id: string,
        private readonly equipamentoId: string,
        public dataHora: Date,
        public origem: string,
        public destino: string,
        public responsavel: string,
        public observacao: string
    ) {}
}