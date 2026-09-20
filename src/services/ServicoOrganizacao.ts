import RepositorioArquivo from "../infra/RepositorioArquivo";
import ValidadorCNPJ from "../infra/validadores/ValidadorCNPJ";
import Organizacao from "../domain/Organizacao";

export default class ServicoOrganizacao {
    constructor(
        private repositorio: RepositorioArquivo,
        private validadorCNPJ: ValidadorCNPJ
    ) {}

    cadastrarOrganizacao(dados: any): Organizacao {
        if (!this.validadorCNPJ.validar(String(dados.cnpj))) {
            throw new Error(this.validadorCNPJ.obterMensagemErro());
        }

        const cnpj = String(dados.cnpj).replace(/\D/g, "");
        const organizacoes = this.carregarOrganizacoes();
        if (organizacoes.some(organizacao => organizacao.cnpj === cnpj)) {
            throw new Error("O CNPJ informado já está cadastrado.");
        }

        const contrato = dados.contratoVigente;
        const organizacao = new Organizacao(
            String(dados.id),
            String(dados.razaoSocial),
            cnpj,
            String(dados.inscricaoEstadual ?? ""),
            String(dados.enderecoCompleto ?? ""),
            String(dados.telefone ?? ""),
            String(dados.email ?? ""),
            dados.dataCadastro instanceof Date ? dados.dataCadastro : new Date(),
            dados.ativo ?? true,
            contrato
        );
        organizacoes.push(this.serializar(organizacao));
        this.repositorio.salvar("organizacoes.json", organizacoes);
        return organizacao;
    }

    buscarOrganizacao(id: string): Organizacao {
        const dados = this.carregarOrganizacoes().find(organizacao => organizacao.id === id);
        if (dados === undefined) {
            throw new Error("Organização não encontrada.");
        }

        return this.criarOrganizacao(dados);
    }

    listarOrganizacoesAtivas(): Organizacao[] {
        return this.carregarOrganizacoes()
            .filter(organizacao => organizacao.ativo)
            .map(organizacao => this.criarOrganizacao(organizacao));
    }

    renovarContrato(organizacaoId: string, novoVencimento: Date): void {
        const organizacoes = this.carregarOrganizacoes();
        const organizacao = organizacoes.find(item => item.id === organizacaoId);
        if (organizacao === undefined) {
            throw new Error("Organização não encontrada.");
        }

        organizacao.contratoVigente.dataVencimento = novoVencimento;
        this.repositorio.salvar("organizacoes.json", organizacoes);
    }

    private carregarOrganizacoes(): any[] {
        if (!this.repositorio.existe("organizacoes.json")) {
            return [];
        }

        return this.repositorio.ler<any[]>("organizacoes.json");
    }

    private criarOrganizacao(dados: any): Organizacao {
        return new Organizacao(
            dados.id,
            dados.razaoSocial,
            dados.cnpj,
            dados.inscricaoEstadual,
            dados.enderecoCompleto,
            dados.telefone,
            dados.email,
            new Date(dados.dataCadastro),
            dados.ativo,
            dados.contratoVigente
        );
    }

    private serializar(organizacao: Organizacao): any {
        return organizacao as any;
    }
}