import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import CriptografiaArquivo from "./CriptografiaArquivo";

export default class RepositorioArquivo {
    private chave: string | null = null;

    constructor(
        private diretorioBase: string,
        private criptografia: CriptografiaArquivo
    ) {
        mkdirSync(this.diretorioBase, { recursive: true });
    }

    definirChave(chave: string): void {
        this.chave = chave;
    }

    salvar<T>(nomeArquivo: string, dados: T): void {
        this.salvarTexto(nomeArquivo, JSON.stringify(dados));
    }

    salvarTexto(nomeArquivo: string, dados: string): void {
        const caminho = this.obterCaminho(nomeArquivo);
        const temporario = `${caminho}.tmp`;
        const dadosCifrados = this.criptografia.cifrar(dados, this.obterChave());

        try {
            writeFileSync(temporario, dadosCifrados, "utf8");
            renameSync(temporario, caminho);
        } catch (erro) {
            if (existsSync(temporario)) {
                unlinkSync(temporario);
            }

            throw erro;
        }
    }

    salvarTextoNaoCriptografado(nomeArquivo: string, dados: string): void {
        writeFileSync(this.obterCaminho(nomeArquivo), dados, "utf8");
    }

    lerTextoNaoCriptografado(nomeArquivo: string): string {
        return readFileSync(this.obterCaminho(nomeArquivo), "utf8");
    }

    ler<T>(nomeArquivo: string): T {
        return JSON.parse(this.lerTexto(nomeArquivo)) as T;
    }

    lerTexto(nomeArquivo: string): string {
        const caminho = this.obterCaminho(nomeArquivo);
        const dadosCifrados = readFileSync(caminho, "utf8");
        return this.criptografia.decifrar(dadosCifrados, this.obterChave());
    }

    existe(nomeArquivo: string): boolean {
        return existsSync(this.obterCaminho(nomeArquivo));
    }

    listar(): string[] {
        return readdirSync(this.diretorioBase, { withFileTypes: true })
            .filter(entrada => entrada.isFile() && !entrada.name.endsWith(".tmp"))
            .map(entrada => entrada.name);
    }

    private obterCaminho(nomeArquivo: string): string {
        const nomeSeguro = basename(nomeArquivo);
        if (nomeSeguro !== nomeArquivo || nomeSeguro.length === 0) {
            throw new Error("Nome de arquivo inválido.");
        }

        return join(this.diretorioBase, nomeSeguro);
    }

    private obterChave(): string {
        if (this.chave === null) {
            throw new Error("Chave criptográfica não configurada.");
        }

        return this.chave;
    }
}