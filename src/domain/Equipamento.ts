import TipoEquipamento from "./enums/TipoEquipamento";
import EstadoFisico from "./enums/EstadoFisico";
import StatusRastreamento from "./enums/StatusRastreamento";
import Movimentacao from "./Movimentacao";

export default class Equipamento {
    constructor(
        private readonly id: string,
        public readonly codigoBarrasInterno: string,
        public tipo: TipoEquipamento,
        public marca: string,
        public modelo: string,
        public readonly anoFabricacao: number,
        public estadoFisico: EstadoFisico,
        public pesoQuilogramas: number,
        private readonly loteId: string,
        public posicaoNoLote: number,
        public statusRastreamento: StatusRastreamento,
        public historicoMovimentacao: Movimentacao[]
    ) {}
}