import RepositorioArquivo from "../infra/RepositorioArquivo";

export default class JournalTransacao {
    constructor(
        private readonly id: string,
        private readonly timestamp: Date,
        private readonly operacao: string,
        private readonly entidade: string,
        private readonly dadosAntes: any,
        private readonly dadosDepois: any,
        private readonly usuarioResponsavel: string,
        private readonly repositorio?: RepositorioArquivo,
        private readonly acaoReversao?: () => void
    ) {}

    registrar(repositorio = this.repositorio): void {
        if (repositorio === undefined) {
            throw new Error("Repositório não configurado para o journal.");
        }

        const agora = new Date();
        const limite = agora.getTime() - 180 * 24 * 60 * 60 * 1000;
        const registros = repositorio.existe("journal.json")
            ? repositorio.ler<any[]>("journal.json")
            : [];
        const registro = {
            id: this.id,
            timestamp: this.timestamp.toISOString(),
            operacao: this.operacao,
            entidade: this.entidade,
            dadosAntes: this.dadosAntes,
            dadosDepois: this.dadosDepois,
            usuarioResponsavel: this.usuarioResponsavel
        };
        const atuais = [...registros, registro]
            .filter(item => new Date(item.timestamp).getTime() >= limite);
        const tamanho = Buffer.byteLength(JSON.stringify(atuais), "utf8");

        if (tamanho > 10 * 1024 * 1024) {
            repositorio.salvar(`journal-${agora.getTime()}.json`, atuais);
            repositorio.salvar("journal.json", []);
            return;
        }

        repositorio.salvar("journal.json", atuais);
    }

    reverter(): boolean {
        if (this.acaoReversao === undefined || this.dadosAntes === undefined) {
            return false;
        }

        this.acaoReversao();
        return true;
    }
}