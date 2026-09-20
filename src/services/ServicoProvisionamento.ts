import CriptografiaArquivo from "../infra/CriptografiaArquivo";
import RepositorioArquivo from "../infra/RepositorioArquivo";
import Credencial from "../domain/Credencial";
import Sessao from "../domain/Sessao";
import PapelUsuario from "../domain/enums/PapelUsuario";
import ServicoAutenticacao from "./ServicoAutenticacao";

export default class ServicoProvisionamento {
    constructor(
        private repositorio: RepositorioArquivo,
        private criptografia: CriptografiaArquivo,
        private autenticacao: ServicoAutenticacao
    ) {}

    provisionar(usuario: string, senha: string): boolean {
        if (this.repositorio.existe("configuracao-mestre.json")) {
            return false;
        }

        const chave = this.criptografia.gerarChave();
        this.repositorio.definirChave(chave);
        this.autenticacao.criarCredencial(
            usuario,
            senha,
            PapelUsuario.ADMINISTRADOR
        );

        this.repositorio.salvarTextoNaoCriptografado("chave-mestre.txt", chave);
        this.repositorio.salvar("credenciais.json", this.autenticacao.listarCredenciais());
        this.repositorio.salvarTexto(
            "configuracao-mestre.json",
            JSON.stringify({ provisionadoEm: new Date().toISOString() })
        );
        return true;
    }

    inicializar(): boolean {
        if (!this.repositorio.existe("configuracao-mestre.json")) {
            return false;
        }

        if (!this.repositorio.existe("chave-mestre.txt")) {
            throw new Error("Configuração encontrada sem chave mestre.");
        }

        this.repositorio.definirChave(
            this.repositorio.lerTextoNaoCriptografado("chave-mestre.txt")
        );

        if (this.repositorio.existe("credenciais.json")) {
            const dados = this.repositorio.ler<any[]>("credenciais.json");
            const credenciais = dados.map(dado => new Credencial(
                dado.usuario,
                dado.hashSenha,
                dado.salt,
                new Date(dado.ultimoAcesso),
                dado.papel
            ));
            this.autenticacao.carregarCredenciais(credenciais);
        }

        if (this.repositorio.existe("sessoes.json")) {
            const dados = this.repositorio.ler<any[]>("sessoes.json");
            const sessoes = dados.map(dado => new Sessao(
                dado.token,
                dado.usuario,
                dado.papel,
                new Date(dado.criacao),
                new Date(dado.expiracao)
            ));
            this.autenticacao.carregarSessoes(sessoes);
        }

        return true;
    }
}
