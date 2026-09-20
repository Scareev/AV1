import Equipamento from "./Equipamento";
import StatusLote from "./enums/StatusLote";

export default class Lote {
    constructor(
        private readonly id: string,
        public readonly dataEntrada: Date,
        public readonly organizacaoId: string,
        public readonly notaFiscal: string,
        public transportadora: string,
        private equipamentos: Equipamento[],
        public statusProcessamento: StatusLote,
        public observacoes: string
    ) {}
}