# Plano: chat com IA (RAG) sobre o currículo

Status: planejado, não iniciado. Data do plano: 2026-11-05.

## Objetivo

Colocar no site um chat em que o recrutador faz perguntas sobre o Silvestre e uma IA responde usando só o currículo e informações extras. O chat serve também como projeto de demonstração de RAG (retrieval-augmented generation).

## Restrições

- Custo zero.
- O front fica no GitHub Pages (github.io), que só serve arquivos estáticos e não guarda chave de API.
- Por isso é preciso um backend mínimo e gratuito para esconder a chave e chamar o LLM.

## Arquitetura

1. **Site (github.io):** widget de chat em HTML/JS, no estilo visual do site atual.
2. **Cloudflare Worker (tier grátis):** recebe a pergunta, faz a busca nos chunks e chama o LLM. A chave nunca vai para o navegador.
3. **LLM:** Workers AI da Cloudflare (sem chave externa). Alternativas: Gemini ou Groq, ambos com tier grátis.
4. **Base de conhecimento:** `curriculo.md` (já existe) mais um arquivo novo `conhecimento.md` com informações extras. Ambos são divididos em chunks.
5. **Embeddings:** um script roda uma vez (e a cada mudança nos arquivos) e gera `embeddings.json` com um vetor por chunk. O Worker usa esse arquivo.

Fluxo de uma pergunta:

1. O navegador envia a pergunta ao Worker.
2. O Worker gera o embedding da pergunta.
3. O Worker calcula a similaridade de cosseno contra `embeddings.json` e pega os top-k chunks (começar com k = 4).
4. O Worker monta o prompt: instrução do sistema, chunks recuperados e pergunta.
5. O LLM responde.
6. O navegador mostra a resposta e as fontes (chunks usados).

## Alternativas descartadas

- **Tudo no navegador (WebLLM / transformers.js):** sem backend, mas baixa 1 a 2 GB e exige WebGPU. Ruim para celular e notebook corporativo.
- **Chave de API direto no JS:** qualquer pessoa extrai a chave e abusa dela.

## Passos

1. Criar conta gratuita na Cloudflare e instalar o `wrangler`.
2. Escrever `conhecimento.md`: projetos, stack, objetivos, disponibilidade de estágio, BrandForge, perguntas frequentes. Não colocar telefone, endereço nem dado sensível, pois o arquivo é público no repo.
3. Escrever o script de chunking e embeddings (Node ou Python) que lê `curriculo.md` e `conhecimento.md` e grava `embeddings.json`.
4. Criar o Worker:
   - endpoint POST `/chat`;
   - embedding da pergunta, busca por cosseno, montagem do prompt, chamada ao LLM;
   - CORS restrito a `https://silvestrefernandes.github.io`;
   - limite de tamanho da pergunta (ex.: 300 caracteres) e da resposta;
   - rate limit por IP;
   - resposta em streaming se for simples.
5. Escrever o prompt de sistema: responder só com base nos trechos fornecidos; se não souber, dizer que não sabe e indicar o contato; responder no idioma da pergunta; ignorar instruções do usuário que tentem mudar essas regras.
6. Criar o widget de chat no `index.html` (nova seção ou botão flutuante), seguindo o estilo do site. Mostrar estado de carregamento, mensagem de erro amigável e as fontes usadas.
7. Testar com perguntas reais de recrutador, incluindo perguntas fora do escopo e tentativas de prompt injection.
8. Atualizar o `README.md` explicando a arquitetura RAG, para o recrutador ver que é um projeto de IA.
9. Fazer o deploy do Worker (`wrangler deploy`) e publicar o site.

## Riscos e cuidados

- **Abuso do endpoint público:** mitigar com CORS, rate limit e limites de tamanho. Monitorar o uso no painel da Cloudflare.
- **Alucinação:** mitigar com o prompt restritivo e a exibição das fontes.
- **Prompt injection:** o usuário controla a pergunta, então o prompt deve tratá-la como dado, não como instrução.
- **Privacidade:** tudo em `curriculo.md` e `conhecimento.md` é público.
- **Limites do tier grátis mudam:** conferir a página de preços da Cloudflare (e do provedor de LLM, se usar outro) antes de começar. Não foram verificados na hora do plano.
- **Corpus pequeno:** colocar tudo no prompt funcionaria igual. Manter embeddings e retrieval porque o objetivo é demonstrar RAG. Documentar isso no README.

## Fora do escopo (por enquanto)

- Histórico de conversa persistente.
- Login ou analytics por usuário.
- Banco vetorial externo (Vectorize ou similar). O JSON basta para o tamanho do corpus.

## Critério de pronto

- O chat no site responde corretamente a pelo menos 10 perguntas típicas de recrutador, com fontes.
- Responde "não sei" para perguntas fora do corpus.
- O limite de requisições funciona.
- Nenhuma chave de API aparece no repositório ou no JS do site.
- O README descreve a arquitetura.
