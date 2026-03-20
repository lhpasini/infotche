# Memorial Descritivo do Projeto Infotche

## 1. Objetivo deste documento

Este memorial descritivo consolida o estado atual do projeto **Infotche**, incluindo a arquitetura geral, os módulos existentes, as integrações, o modelo de dados, o fluxo operacional implantado e os pontos de atenção para a próxima fase de evolução.

O objetivo é deixar uma base técnica e funcional clara para continuidade do trabalho sem perda de contexto.

---

## 2. Visão geral do projeto

O projeto **Infotche** é um sistema web interno da empresa, desenvolvido para apoiar:

- o controle e acompanhamento dos atendimentos internos da loja;
- o cadastro e manutenção de clientes, conexões e chamados;
- a consulta de histórico legado;
- o cadastro móvel de equipamentos em campo por técnicos;
- o armazenamento de fotos dos equipamentos no Google Drive com vínculo no banco de dados.

Atualmente o sistema possui duas grandes áreas de operação:

- **Área administrativa** em `/admin`
- **Área técnica mobile** em `/tecnico`

Além disso, o projeto mantém um site institucional simples em sua área pública.

---

## 3. Stack tecnológica

### 3.1. Framework principal

- **Next.js 16.1.6**
- **React 19.2.3**
- **TypeScript**

### 3.2. Banco e ORM

- **PostgreSQL**
- **Prisma ORM**

### 3.3. OCR e arquivos

- **Tesseract.js** para OCR
- **Google Drive API** via **OAuth 2.0** para upload de imagens

### 3.4. Build e execução

- `npm run dev` para desenvolvimento
- `npm run build`
- `npm run start`

### 3.5. Hospedagem atual

- **Hostinger**
- Orquestração por **Coolify**
- Deploy a partir do repositório GitHub:
  - `lhpasini/infotche`
  - branch `main`

---

## 4. Estrutura funcional do sistema

### 4.1. Área pública

A área pública do projeto funciona como presença institucional e acesso a recursos auxiliares.

Responsabilidades principais:

- home institucional;
- layout público;
- páginas auxiliares como webmail.

### 4.2. Área administrativa `/admin`

É o núcleo do sistema interno da loja. Essa área já existia antes da criação do módulo técnico e concentra a operação administrativa do negócio.

Funções principais:

- dashboard operacional;
- gestão de chamados;
- gestão de clientes;
- gestão de categorias;
- relatórios;
- gestão de usuários;
- histórico legado;
- visualização dos registros do módulo de equipamentos.

### 4.3. Área técnica `/tecnico`

É o novo módulo mobile-first criado para uso em campo pelos técnicos.

Funções principais:

- login do técnico;
- dashboard simplificado;
- criação de novo registro de equipamentos;
- captura de foto na hora ou escolha de imagem do celular;
- leitura OCR da etiqueta;
- revisão e correção manual dos dados;
- múltiplos itens dentro do mesmo atendimento;
- gravação no banco;
- upload da imagem para o Google Drive;
- consulta de histórico dos registros realizados.

---

## 5. Objetivo de negócio de cada módulo

### 5.1. `/admin`

A área `/admin` atende a gestão da loja e dos atendimentos internos. O foco é operacional e administrativo.

### 5.2. `/tecnico`

A área `/tecnico` foi criada com foco em velocidade de uso no celular, com o mínimo de atrito possível para o técnico em campo.

Premissas da ferramenta:

- o técnico já preenche muitos dados no sistema da Mhnet;
- esta ferramenta não deve sobrecarregar o técnico;
- o objetivo central é **rastrear equipamentos**;
- o preenchimento deve ser simples, rápido e orientado a foto + OCR;
- a integração com o fluxo completo do atendimento da Mhnet não é obrigatória neste momento.

---

## 6. Arquitetura de autenticação e sessão

### 6.1. Base de usuários

O sistema utiliza uma tabela única de usuários (`Usuario`) para autenticação compartilhada entre `/admin` e `/tecnico`.

Campos principais:

- `nome`
- `login`
- `senha`
- `role`
- `ativo`

### 6.2. Regras atuais

- usuários podem estar **ativos** ou **inativos**;
- usuários inativos não conseguem acessar o sistema;
- o login é normalizado para minúsculas;
- existe proteção especial para o usuário `admin`;
- a autenticação é compartilhada entre os módulos administrativo e técnico.

### 6.3. Situação atual de autorização

Hoje a autenticação é compartilhada e funcional, mas a separação fina entre acesso ao `/admin` e ao `/tecnico` ainda não foi totalmente especializada no modelo de permissões.

Estado atual:

- `ADMIN`: acesso administrativo completo;
- `TECNICO`: papel disponível e funcional;
- o projeto ainda pode evoluir para uma separação mais refinada, por exemplo:
  - acesso exclusivo ao admin;
  - acesso exclusivo ao técnico;
  - acesso aos dois ambientes.

---

## 7. Modelo de dados atual

O banco de dados é mantido em PostgreSQL, com schema Prisma.

### 7.1. Tabelas do núcleo administrativo

#### `Categoria`

Responsável por armazenar as categorias de atendimento.

#### `Cliente`

Armazena os dados do cliente.

Campos relevantes:

- nome
- cidade
- CPF/CNPJ
- e-mail
- WhatsApp
- status

#### `Conexao`

Armazena os dados da conexão/instalação vinculada ao cliente.

Campos relevantes:

- contrato Mhnet
- endereço
- bairro
- PPPoE
- senha PPPoE

#### `Chamado`

Tabela principal da gestão de atendimentos internos.

Campos relevantes:

- protocolo
- cliente e conexão vinculados
- nome do cliente
- cidade
- endereço
- categoria
- motivo
- PPPoE
- contrato Mhnet
- observações
- técnico
- resolução
- prioridade
- status

#### `HistoricoLegado`

Armazena o arquivo morto importado, com base em histórico antigo.

Campos relevantes:

- nome do cliente
- resumo
- detalhes brutos
- data de referência

#### `Usuario`

Tabela de autenticação e acesso.

Campos relevantes:

- nome
- login
- senha
- role
- ativo

### 7.2. Tabelas do módulo técnico de equipamentos

#### `CapturaEquipamento`

Tabela anterior ou intermediária para registro simples de capturas.

Observação:
o fluxo atual do novo módulo passou a se apoiar principalmente em `AtendimentoEquipamento` e `AtendimentoEquipamentoItem`, mas a tabela `CapturaEquipamento` permanece no schema como base histórica/estrutural.

#### `AtendimentoEquipamento`

Representa o cabeçalho do registro feito pelo técnico.

Campos principais:

- técnico responsável;
- nome do cliente;
- tipo de atendimento;
- data de criação;
- data de atualização.

Cada atendimento pode conter múltiplos itens.

#### `AtendimentoEquipamentoItem`

Representa cada equipamento registrado dentro de um atendimento.

Campos principais:

- tipo de equipamento;
- marca;
- modelo;
- código do equipamento;
- MAC address;
- serial number;
- usuário de acesso;
- senha de acesso;
- URL da imagem;
- ID do arquivo no Drive;
- texto bruto do OCR;
- observações.

#### `IntegracaoGoogleDrive`

Armazena a conexão OAuth usada para enviar imagens ao Google Drive.

Campos principais:

- e-mail da conta Google conectada;
- refresh token;
- access token;
- escopo;
- tipo do token;
- data de expiração;
- ID da pasta de destino.

---

## 8. Fluxo funcional do módulo técnico

### 8.1. Login

O técnico acessa:

- `/tecnico/login`

Utiliza os mesmos usuários já cadastrados no sistema.

### 8.2. Dashboard do técnico

Após login, o técnico acessa uma home simplificada com foco operacional.

Opções principais:

- iniciar novo registro;
- consultar histórico.
- instalar o atalho/app na tela inicial do celular.

Foi removido da home o card de conexão do Google Drive para não poluir a operação do técnico.

### 8.2.1. Comportamento de aplicativo no celular

O módulo `/tecnico` passou a contar com estrutura de **PWA** para uso em Android.

Isso inclui:

- `manifest.webmanifest`;
- ícones de instalação;
- `service worker` mínimo para permitir instalação;
- abertura em modo `standalone`;
- orientação visual na home técnica para adicionar o app à tela inicial.

Na prática, o técnico pode abrir o módulo no navegador do celular e instalar como atalho/app sem necessidade de Play Store.

### 8.3. Novo registro

Fluxo principal:

1. informar o nome do cliente;
2. selecionar o tipo de atendimento;
3. adicionar imagem do equipamento;
4. OCR processa o texto da etiqueta;
5. sistema tenta preencher os campos automaticamente;
6. técnico revisa e corrige manualmente se necessário;
7. salva o item localmente no atendimento;
8. pode adicionar mais equipamentos;
9. finaliza o atendimento.

### 8.4. Tipos de entrada de imagem

O sistema passou a oferecer duas opções explícitas:

- **Tirar foto agora**
- **Escolher imagem do celular**

Isso foi implementado para atender tanto o uso em campo quanto o reaproveitamento de imagens já armazenadas no aparelho.

### 8.5. Finalização do atendimento

Ao clicar em finalizar:

1. os dados são enviados para a API;
2. cada foto é enviada ao Google Drive;
3. a URL do arquivo e o ID do Drive são armazenados;
4. o atendimento e seus itens são gravados no banco;
5. o histórico passa a refletir o novo registro.

### 8.6. Histórico técnico

O técnico pode consultar:

- cliente;
- MAC;
- serial;
- código do equipamento;
- marca;
- modelo.

O histórico atual consulta principalmente os registros do módulo novo. A ampliação para incluir o arquivo morto legado ficou prevista como próxima fase.

---

## 9. OCR: funcionamento e regras atuais

### 9.1. Tecnologia

O OCR é realizado com **Tesseract.js**.

### 9.2. Estratégia adotada

O sistema processa a etiqueta e tenta extrair:

- tipo de equipamento;
- marca;
- modelo;
- código do equipamento;
- MAC;
- serial;
- usuário;
- senha.

### 9.3. Regras de limpeza e normalização

Foram adicionadas regras específicas para melhorar leitura de etiquetas reais da operação, especialmente de marcas e modelos recorrentes como Huawei e equipamentos Mhnet/EK.

Também foram adicionadas regras para remover ruídos comuns de OCR, como:

- `Scan for Quick Start`
- `Quick Start`
- `Huawei AI Life`
- `WiFi Certified`

Esses textos não devem mais contaminar campos como serial e modelo.

### 9.4. Situação prática do OCR

O OCR está funcional e já validado em produção com leitura aceitável para uso real, mas continua sendo um ponto naturalmente passível de evolução com base em novas fotos e padrões de etiqueta.

---

## 10. Integração com Google Drive

### 10.1. Estratégia escolhida

Como a conta Google utilizada é pessoal e não Google Workspace com drive compartilhado, a integração adotada foi:

- **OAuth 2.0 com conta Google humana**

e não:

- conta de serviço.

### 10.2. Motivo da escolha

A abordagem com service account não funcionou para upload em `Meu Drive` devido à limitação de quota.

Portanto a solução correta foi:

- autorizar uma conta Google real;
- armazenar o refresh token;
- usar essa autorização para enviar arquivos à pasta definida.

### 10.3. Variáveis de ambiente necessárias

O sistema depende destas variáveis:

- `DATABASE_URL`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

### 10.4. Redirect URI de produção

Em produção, a URI configurada é:

- `https://infotche.com.br/api/google/drive/callback`

### 10.5. Situação atual

Fluxo já validado:

- conexão OAuth realizada;
- upload da imagem concluído com sucesso;
- arquivo confirmado no Drive;
- vínculo salvo no banco.

---

## 11. Área administrativa `/admin`

### 11.1. Responsabilidades

A área administrativa continua sendo o painel central da operação interna da loja.

Funções:

- gestão de chamados;
- gestão de clientes;
- gestão de categorias;
- relatórios;
- usuários;
- histórico do sistema;
- histórico legado;
- nova aba de equipamentos do módulo técnico.

### 11.2. Nova aba "Equipamentos"

Foi adicionada uma aba administrativa para permitir a visualização dos registros feitos pelos técnicos.

Essa aba permite listar:

- cliente;
- tipo de atendimento;
- técnico responsável;
- equipamentos vinculados;
- marca;
- modelo;
- código;
- MAC;
- serial;
- disponibilidade de foto.

### 11.2.1. Estado atual da area de Equipamentos no admin

A area `Equipamentos` no `/admin` evoluiu e hoje possui:

- subabas para `Registros`, `Arquivo Morto` e `Tipos de Atendimento`;
- filtros por periodo nos registros novos;
- filtros por data, autor e busca no arquivo morto;
- edicao e exclusao de registros novos;
- visualizacao do arquivo morto importado do WhatsApp;
- gestao dos tipos de atendimento usados no formulario tecnico.

Regras atuais de permissao:

- usuario `ADMIN` pode ver, editar e apagar registros de equipamentos;
- usuario `TECNICO` pode ver todos os registros;
- usuario `TECNICO` pode editar apenas registros criados por ele mesmo;
- usuario `TECNICO` nao pode apagar historico;
- a subaba `Tipos de Atendimento` permanece restrita a admin.

Auditoria atual dos registros:

- o cabecalho `AtendimentoEquipamento` passou a registrar `alteradoPor` e `alteradoEm`;
- quando um registro eh alterado, o admin exibe essa informacao no card do registro.

### 11.3. Ajustes feitos no menu

Durante a implantação dessa aba, foram realizados ajustes para:

- posicionar `Equipamentos` como última opção do menu;
- restaurar corretamente os ícones dos itens da sidebar;
- preservar o layout antigo do admin;
- evitar quebra da renderização principal.

---

## 12. Gestão de usuários

### 12.1. Melhorias implementadas

Foram implantadas melhorias importantes na gestão de usuários:

- campo `ativo/inativo`;
- bloqueio de login para usuário inativo;
- validação de senha mínima;
- proteção contra login duplicado;
- normalização do login em minúsculas;
- proteção adicional ao usuário `admin`.

### 12.2. Situação atual

Essas melhorias já foram levadas para produção.

### 12.3. Evolução sugerida

Na próxima fase, recomenda-se discutir:

- separação de acesso por área;
- perfis mais granulares;
- fluxo de troca inicial de senha;
- políticas de permissão mais rígidas no servidor.

---

## 13. Deploy e operação em produção

### 13.1. Hospedagem

O sistema roda em:

- **Hostinger**
- gerenciamento por **Coolify**

### 13.2. Repositório

- GitHub: `lhpasini/infotche`
- branch de produção: `main`

### 13.3. Comandos usados no Coolify

#### Build Command

```bash
npx prisma generate && npx prisma db push && npm run build
```

#### Start Command

```bash
npm run start
```

### 13.4. Observações de deploy

- o sistema compartilha a mesma aplicação já existente do Infotche;
- não foi criado projeto separado para o módulo técnico;
- o deploy deve preservar o funcionamento do `/admin` e do `/tecnico` juntos;
- sempre que o código é alterado localmente, é necessário:
  - commit;
  - push para `main`;
  - redeploy no Coolify.

---

## 14. Estado atual do projeto

### 14.1. O que já está funcionando

- login administrativo;
- login técnico;
- cadastro de chamados no admin;
- gestão de clientes e conexões;
- categorias;
- relatórios;
- histórico legado;
- gestão de usuários;
- módulo mobile técnico;
- OCR funcional;
- upload de imagens no Google Drive;
- histórico técnico;
- listagem administrativa dos registros de equipamentos;
- deploy em produção.

### 14.2. O que já foi validado pelo usuário

Já houve validação prática de:

- acesso ao sistema pelo celular;
- captura/seleção de imagem;
- leitura de etiqueta;
- gravação no banco;
- upload da imagem para o Google Drive;
- visualização no histórico;
- funcionamento da área online em produção.

---

## 15. Pontos de atenção e dívida técnica

### 15.1. Segurança de autenticação

Atualmente o sistema ainda trabalha com uma abordagem simples de autenticação e armazenamento de senha, herdada da estrutura inicial do projeto.

Pontos a revisar futuramente:

- hash de senha;
- endurecimento do cookie/sessão;
- validação de permissão por rota e por action;
- separação mais forte entre admin e técnico.

### 15.2. Página administrativa muito concentrada

A página `/admin` concentra muita regra de negócio e muito JSX em um único arquivo.

Risco:

- manutenção mais difícil;
- maior chance de regressão em mudanças futuras;
- menor legibilidade do código.

### 15.3. OCR dependente da qualidade da imagem

O OCR já está funcional, mas naturalmente depende de:

- foco;
- iluminação;
- contraste;
- enquadramento.

Recomendação:

- continuar refinando o parser à medida que surgirem novas etiquetas reais.

### 15.4. Histórico legado ainda parcial na integração nova

Hoje o módulo técnico já consulta o histórico novo, mas a unificação com o arquivo morto antigo ainda é um ponto de evolução.

---

## 16. Próxima fase recomendada

### 16.1. Frente funcional

- consolidar a área `Equipamentos` no admin;
- melhorar filtros, busca e preview de fotos;
- incluir exportação;
- estudar vínculo opcional com chamados do admin;
- começar a tratar cancelamentos e devoluções como fluxo mais explícito.

### 16.2. Frente de dados

- projetar importação do histórico antigo vindo de pastas/WhatsApp;
- criar estratégia de arquivo morto unificado;
- padronizar identificação dos equipamentos antigos.

### 16.3. Frente de autorização

- definir se o mesmo usuário acessa admin e técnico;
- separar permissões por área;
- endurecer restrições no servidor.

### 16.4. Frente técnica

- modularizar a página `/admin`;
- revisar segurança de autenticação;
- criar testes mínimos para fluxos críticos;
- padronizar documentação de deploy e operação.

---

## 17. Resumo executivo

O projeto **Infotche** evoluiu de um sistema interno de gestão administrativa para uma plataforma com dois pilares:

- **gestão administrativa da loja**, via `/admin`;
- **rastreabilidade móvel de equipamentos em campo**, via `/tecnico`.

O novo módulo técnico já está implantado e validado em produção com:

- OCR funcional;
- registro em banco;
- upload de imagens ao Google Drive;
- histórico consultável;
- integração visual com a área administrativa.

O sistema está operacional e pronto para entrar em uma segunda fase de maturação, com foco em:

- refino do histórico;
- fortalecimento das permissões;
- importação do legado antigo;
- e evolução da inteligência operacional do controle de equipamentos.

---

## 18. Arquivos centrais de referência técnica

Arquivos importantes para continuidade:

- `package.json`
- `prisma/schema.prisma`
- `app/(sistema)/admin/page.tsx`
- `app/actions/auth.ts`
- `app/actions/usuarios.ts`
- `app/actions/tecnico-registros.ts`
- `app/api/tecnico/atendimentos/route.ts`
- `app/api/google/drive/start/route.ts`
- `app/api/google/drive/callback/route.ts`
- `lib/auth-session.ts`
- `lib/equipment-ocr.ts`
- `lib/google-drive.ts`
- `lib/google-drive-oauth.ts`
- `DEPLOY-HOSTINGER.md`

---

## 19. Observação final

Este documento representa o estado consolidado do projeto até esta etapa. Ele deve ser utilizado como ponto de partida oficial para a próxima fase de desenvolvimento, evitando retrabalho, perda de contexto e decisões desconectadas do que já foi validado em produção.
