import StatusRastreamento from "../domain/enums/StatusRastreamento";
import RepositorioArquivo from "../infra/RepositorioArquivo";

export default class ServicoRelatorio {
    constructor(private repositorio?: RepositorioArquivo) {}

    gerarRelatorioPorOrganizacao(
        organizacaoId: string,
        periodo: { inicio: Date, fim: Date }
    ): string {
        const lotes = this.lerArquivo<any[]>("lotes.json");
        const resultado = lotes.filter(lote => {
            const data = new Date(lote.dataEntrada).getTime();
            return lote.organizacaoId === organizacaoId
                && data >= periodo.inicio.getTime()
                && data <= periodo.fim.getTime();
        });

        return JSON.stringify({ organizacaoId, totalLotes: resultado.length, lotes: resultado });
    }

    gerarRelatorioPorStatus(
        status: StatusRastreamento
    ): string {
        const equipamentos = this.lerArquivo<any[]>("equipamentos.json")
            .filter(equipamento => equipamento.statusRastreamento === status);
        return JSON.stringify({ status, totalEquipamentos: equipamentos.length, equipamentos });
    }

    gerarRelatorioFinanceiro(
        periodo: { inicio: Date, fim: Date }
    ): string {
        const organizacoes = this.lerArquivo<any[]>("organizacoes.json");
        const contratos = organizacoes
            .filter(organizacao => {
                const data = new Date(organizacao.dataCadastro).getTime();
                return data >= periodo.inicio.getTime() && data <= periodo.fim.getTime();
            })
            .map(organizacao => ({
                organizacaoId: organizacao.id,
                valorMensal: organizacao.contratoVigente?.valorMensal ?? 0
            }));
        const totalMensal = contratos.reduce((total, contrato) => total + contrato.valorMensal, 0);

        return JSON.stringify({ totalMensal, contratos });
    }

    private lerArquivo<T>(nomeArquivo: string): T {
        if (this.repositorio === undefined || !this.repositorio.existe(nomeArquivo)) {
            return [] as T;
        }

        return this.repositorio.ler<T>(nomeArquivo);
    }
}