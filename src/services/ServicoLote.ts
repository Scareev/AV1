import RepositorioArquivo from "../infra/RepositorioArquivo";
import Lote from "../domain/Lote";
import Equipamento from "../domain/Equipamento";
import StatusLote from "../domain/enums/StatusLote";
import ValidadorDataEntrada from "../infra/validadores/ValidadorDataEntrada";

export default class ServicoLote {
    constructor(
        private repositorio: RepositorioArquivo,
        private validadorDataEntrada = new ValidadorDataEntrada()
    ) {}

    criarLote(dados: any): Lote {
        const dataEntrada = dados.dataEntrada instanceof Date
            ? dados.dataEntrada
            : new Date(dados.dataEntrada ?? Date.now());
        if (!this.validadorDataEntrada.validar(dataEntrada)) {
            throw new Error(this.validadorDataEntrada.obterMensagemErro());
        }

        const lotes = this.carregarLotes();
        const lote = new Lote(
            String(dados.id),
            dataEntrada,
            String(dados.organizacaoId),
            String(dados.notaFiscal),
            String(dados.transportadora),
            dados.equipamentos ?? [],
            dados.statusProcessamento ?? StatusLote.RECEBIDO,
            String(dados.observacoes ?? "")
        );
        lotes.push(lote as any);
        this.repositorio.salvar("lotes.json", lotes);
        return lote;
    }

    adicionarEquipamentoLote(
        loteId: string,
        equipamento: Equipamento
    ): void {
        const lotes = this.carregarLotes();
        const lote = lotes.find(item => item.id === loteId);
        if (lote === undefined) {
            throw new Error("Lote não encontrado.");
        }

        lote.equipamentos.push(equipamento);
        this.repositorio.salvar("lotes.json", lotes);
    }

    processarTriagem(loteId: string): void {
        const lotes = this.carregarLotes();
        const lote = lotes.find(item => item.id === loteId);
        if (lote === undefined) {
            throw new Error("Lote não encontrado.");
        }

        lote.statusProcessamento = StatusLote.TRIAGEM_CONCLUIDA;
        this.repositorio.salvar("lotes.json", lotes);
    }

    consultarLotePorPeriodo(
        dataInicio: Date,
        dataFim: Date
    ): Lote[] {
        return this.carregarLotes()
            .filter(lote => {
                const data = new Date(lote.dataEntrada).getTime();
                return data >= dataInicio.getTime() && data <= dataFim.getTime();
            })
            .map(lote => this.reconstruirLote(lote));
    }

    private carregarLotes(): any[] {
        if (!this.repositorio.existe("lotes.json")) {
            return [];
        }

        return this.repositorio.ler<any[]>("lotes.json");
    }

    private reconstruirLote(dados: any): Lote {
        return new Lote(
            dados.id,
            new Date(dados.dataEntrada),
            dados.organizacaoId,
            dados.notaFiscal,
            dados.transportadora,
            dados.equipamentos,
            dados.statusProcessamento,
            dados.observacoes
        );
    }
}