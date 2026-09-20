import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export default class CriptografiaArquivo {
    cifrar(dados: string, chave: string): string {
        const chaveBuffer = this.obterChave(chave);
        const iv = randomBytes(12);
        const cifra = createCipheriv("aes-256-gcm", chaveBuffer, iv);
        const conteudo = Buffer.concat([
            cifra.update(dados, "utf8"),
            cifra.final()
        ]);
        const tag = cifra.getAuthTag();

        return [iv, tag, conteudo]
            .map(parte => parte.toString("base64"))
            .join(":");
    }

    decifrar(dadosCifrados: string, chave: string): string {
        const partes = dadosCifrados.split(":");
        if (partes.length !== 3) {
            throw new Error("Dados criptografados possuem formato inválido.");
        }

        const ivCodificado = partes[0];
        const tagCodificada = partes[1];
        const conteudoCodificado = partes[2];
        if (ivCodificado === undefined || tagCodificada === undefined || conteudoCodificado === undefined) {
            throw new Error("Dados criptografados incompletos.");
        }

        const decifra = createDecipheriv(
            "aes-256-gcm",
            this.obterChave(chave),
            Buffer.from(ivCodificado, "base64")
        );
        decifra.setAuthTag(Buffer.from(tagCodificada, "base64"));

        return Buffer.concat([
            decifra.update(Buffer.from(conteudoCodificado, "base64")),
            decifra.final()
        ]).toString("utf8");
    }

    gerarChave(): string {
        return randomBytes(32).toString("base64");
    }

    private obterChave(chave: string): Buffer {
        const chaveBuffer = Buffer.from(chave, "base64");
        if (chaveBuffer.length !== 32) {
            throw new Error("A chave deve conter 32 bytes para AES-256.");
        }

        return chaveBuffer;
    }
}