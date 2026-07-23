# Como colocar o Painel do Aventureiro na internet

Este guia cobre os 3 passos: banco de dados (Google Sheets), repositório (GitHub) e publicação (Netlify).

## 1. Banco de dados — Google Sheets

1. Crie uma planilha nova no Google Sheets (pode chamar de "Painel Aventureiro — Dados").
2. Vá em **Extensões → Apps Script**.
3. Apague o conteúdo padrão do arquivo `Code.gs` e cole o conteúdo do arquivo `google-apps-script/Code.gs` deste projeto.
4. Clique em **Implantar → Nova implantação**.
   - Tipo: **App da Web**.
   - Executar como: **Eu** (sua conta).
   - Quem pode acessar: **Qualquer pessoa**.
5. Autorize as permissões pedidas (é a sua própria planilha, então é seguro).
6. Copie a URL que termina em `/exec` — é a URL do seu backend.
7. Abra o arquivo `js/storage-adapter.js` do projeto e cole essa URL na linha:
   ```js
   const SHEETS_API_URL = 'https://script.google.com/macros/s/SEU_ID_AQUI/exec';
   ```
8. Pronto — a planilha cria sozinha a aba "Personagens" na primeira vez que alguém salvar um personagem pelo site.

**Sobre "cada jogador vê só os seus personagens":** cada jogador escolhe (ou aceita uma sugestão do app) um **código de acesso** na primeira vez que abre o site — algo como `LOBO-4821` ou uma frase própria. Esse código é salvo junto de cada personagem na planilha e usado pra filtrar o que aparece pra cada um. Digitando o mesmo código em outro aparelho, os personagens aparecem lá também — não precisa ficar preso a um único celular. Quem digitar **"Mestre"** como código cai direto nas ferramentas de mestre (bestiário, tesouro, lojas etc.), em vez da lista de personagens — assim essa opção não fica visível à toa pros outros jogadores que usam a mesma planilha. Não existe senha de verdade nem conta — é só um código combinado, suficiente pra um app de mesa entre amigos.

Se algum dia quiser ver todos os personagens de todos os jogadores (visão de mestre/admin), é só abrir a planilha diretamente no Google Sheets — cada linha tem o JSON completo do personagem na coluna "DadosJSON".

## 2. Repositório — GitHub

1. Crie um repositório novo no GitHub (pode ser privado ou público).
2. Suba todos os arquivos deste projeto pra ele (mantendo a estrutura de pastas: `index.html`, `css/`, `js/`, `data/`, `google-apps-script/`).
   - Pelo site do GitHub: "Add file → Upload files", arraste tudo.
   - Ou por linha de comando, se preferir:
     ```
     git init
     git add .
     git commit -m "Painel do Aventureiro"
     git branch -M main
     git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
     git push -u origin main
     ```

## 3. Publicação — Netlify

1. Crie uma conta em [netlify.com](https://www.netlify.com) (pode entrar direto com sua conta do GitHub).
2. Clique em **Add new site → Import an existing project**.
3. Escolha **GitHub** e selecione o repositório que você criou.
4. Configurações de build: deixe **em branco** (não precisa de comando de build nem pasta de publicação especial — é um site estático puro, a pasta raiz já serve).
5. Clique em **Deploy site**.
6. Em alguns segundos o Netlify te dá uma URL tipo `nome-aleatorio.netlify.app` — é isso que você compartilha com o grupo.
7. (Opcional) Em **Site settings → Domain management**, você pode trocar esse nome por algo mais fácil de lembrar, tipo `mesa-tormenta.netlify.app`.

A partir daí, qualquer alteração que você fizer no código e enviar pro GitHub (`git push`) publica automaticamente no Netlify em menos de um minuto.

## Testando antes de divulgar

Depois de publicado, abra o link, crie um personagem de teste, feche a aba, abra de novo — se o personagem continuar lá, o backend da planilha está funcionando. Se sumir, confira se a `SHEETS_API_URL` foi colada certinha e se a implantação do Apps Script está com "Quem pode acessar: Qualquer pessoa".
