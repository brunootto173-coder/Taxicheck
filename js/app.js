
(function aplicarTemaSalvo(){

    let tema = localStorage.getItem("taxicheckTema");

    if(tema === "escuro"){

        document.body.classList.add("tema-escuro");

    }

})();



function configuracaoPadrao(){

    return {

        tolerancia: 0.25,

        aliasesNumero: ["numero", "nochamado"],

        aliasesValor: ["valor"],

        aliasesCliente: ["cliente", "nomecliente", "razaosocial"],

        historicoLimite: 30

    };

}



function carregarConfiguracoes(uid){

    db.collection("configuracoes").doc(uid).get()
    .then(function(doc){

        window.configUsuario = doc.exists
            ? Object.assign(configuracaoPadrao(), doc.data())
            : configuracaoPadrao();

    })
    .catch(function(erro){

        console.error("Erro ao carregar configurações:", erro);

        window.configUsuario = configuracaoPadrao();

    });

}



function normalizarNomeCliente(nome){

    return (nome === null || nome === undefined)
        ? ""
        : nome.toString().trim().toLowerCase().replace(/\s+/g, " ");

}



function carregarClientes(uid){

    db.collection("clientes")
    .where("uid", "==", uid)
    .get()
    .then(function(snapshot){

        window.clientesUsuario = snapshot.docs.map(function(doc){

            let d = doc.data();

            return {

                id: doc.id,
                nome: d.nome,
                desconto: d.desconto,
                valorMinimo: (d.valorMinimo === undefined ? null : d.valorMinimo)

            };

        });

    })
    .catch(function(erro){

        console.error("Erro ao carregar clientes:", erro);

        window.clientesUsuario = [];

    });

}



function buscarClienteCadastrado(nomeCliente){

    if(!nomeCliente || !window.clientesUsuario || !window.clientesUsuario.length){

        return null;

    }

    let alvo = normalizarNomeCliente(nomeCliente);

    return window.clientesUsuario.find(function(c){

        return normalizarNomeCliente(c.nome) === alvo;

    }) || null;

}



function buscarDescontoCliente(nomeCliente){

    let cliente = buscarClienteCadastrado(nomeCliente);

    return (cliente && cliente.desconto !== undefined && cliente.desconto !== null)
        ? cliente.desconto
        : null;

}



function buscarValorMinimoCliente(nomeCliente){

    let cliente = buscarClienteCadastrado(nomeCliente);

    return (cliente && cliente.valorMinimo !== undefined && cliente.valorMinimo !== null)
        ? cliente.valorMinimo
        : null;

}



function entrar(){

    let email = document.getElementById("usuario").value.trim();

    let senha = document.getElementById("senha").value;

    let mensagem = document.getElementById("mensagem");

    let botao = document.querySelector("#loginTela button");

    mensagem.innerHTML = "";

    if(!email || !senha){

        mensagem.innerHTML = "Preencha e-mail e senha";

        return;

    }

    botao.disabled = true;

    botao.innerHTML = "Entrando...";

    firebase.auth()
    .signInWithEmailAndPassword(email, senha)
    .catch(function(erro){

        mensagem.innerHTML = traduzirErroLogin(erro.code);

    })
    .finally(function(){

        botao.disabled = false;

        botao.innerHTML = "Entrar";

    });

}



function traduzirErroLogin(codigo){

    switch(codigo){

        case "auth/invalid-email":
            return "E-mail inválido";

        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Usuário ou senha incorretos";

        case "auth/too-many-requests":
            return "Muitas tentativas. Tente novamente mais tarde";

        default:
            return "Erro ao entrar. Tente novamente";

    }

}



function sair(){

    firebase.auth().signOut();

}



function ativarMenu(botao){

    document.querySelectorAll(".nav-item")
    .forEach(function(item){

        item.classList.remove("ativo");

    });

    botao.classList.add("ativo");

}



// Mantém a tela certa conforme o estado do login
// (inclusive ao recarregar a página)

firebase.auth().onAuthStateChanged(function(usuario){

    if(usuario){

        carregarConfiguracoes(usuario.uid);

        carregarClientes(usuario.uid);

        document.getElementById("loginTela")
        .classList.add("escondido");

        document.getElementById("dashboard")
        .classList.remove("escondido");

    } else {

        document.getElementById("dashboard")
        .classList.add("escondido");

        document.getElementById("loginTela")
        .classList.remove("escondido");

        document.getElementById("usuario").value = "";
        document.getElementById("senha").value = "";

    }

});




function verHistorico(){

    document.getElementById("resultado").innerHTML = `

    <div class="secao-titulo">
        <h2>Histórico de Conferências</h2>
        <p class="secao-desc">Últimas comparações realizadas por você.</p>
    </div>

    <div id="listaHistorico">

        <div class="status-info">
            <p>Carregando...</p>
        </div>

    </div>

    `;

    let uid = firebase.auth().currentUser.uid;

    db.collection("historico")
    .where("uid", "==", uid)
    .orderBy("dataHora", "desc")
    .limit((window.configUsuario && window.configUsuario.historicoLimite) || 30)
    .get()
    .then(function(snapshot){

        if(snapshot.empty){

            document.getElementById("listaHistorico").innerHTML = `

            <div class="status-info">
                <p>Nenhuma conferência salva ainda.</p>
            </div>

            `;

            return;

        }

        let html = `

        <div class="tabela-card">

        <table>

        <thead>

        <tr>
            <th>Data</th>
            <th>Planilha</th>
            <th>Total</th>
            <th>Encontrados</th>
            <th>Divergência</th>
            <th>Não encontrados</th>
            <th></th>
        </tr>

        </thead>

        <tbody>

        `;

        snapshot.forEach(function(doc){

            let d = doc.data();

            let data = d.dataHora
                ? d.dataHora.toDate().toLocaleString("pt-BR")
                : "-";

            let dataPlanilha = d.dataPlanilha
                ? formatarDataBR(d.dataPlanilha)
                : "-";

            html += `

            <tr>
                <td>${data}</td>
                <td>${dataPlanilha}</td>
                <td>${d.total}</td>
                <td>${d.encontrados.length}</td>
                <td>${d.divergencias.length}</td>
                <td>${d.naoEncontrados.length}</td>
                <td>
                    <button class="botao-secundario" onclick="verDetalheHistorico('${doc.id}')">
                        Ver
                    </button>
                </td>
            </tr>

            `;

        });

        html += `

        </tbody>

        </table>

        </div>

        `;

        document.getElementById("listaHistorico").innerHTML = html;

    })
    .catch(function(erro){

        console.error("Erro ao carregar histórico:", erro);

        document.getElementById("listaHistorico").innerHTML = `

        <div class="status-info">
            <p>Não foi possível carregar o histórico.</p>
        </div>

        `;

    });

}



function verDetalheHistorico(id){

    db.collection("historico").doc(id).get()
    .then(function(doc){

        if(!doc.exists){

            alert("Registro não encontrado");

            return;

        }

        let d = doc.data();

        let comDesconto = d.comDesconto || [];
        let comValorMinimo = d.comValorMinimo || [];

        window.resultadoTaxiCheck = {

            total: d.total,

            dataPlanilha: d.dataPlanilha || "",

            encontrados: d.encontrados,

            comDesconto: comDesconto,

            comValorMinimo: comValorMinimo,

            divergencias: d.divergencias,

            naoEncontrados: d.naoEncontrados

        };

        window.conferidosAtual = d.conferidos || {};
        window.idHistoricoAtual = id;

        let data = d.dataHora
            ? d.dataHora.toDate().toLocaleString("pt-BR")
            : "";

        let dataPlanilhaTexto = d.dataPlanilha
            ? ` · Planilha referente a ${formatarDataBR(d.dataPlanilha)}`
            : "";

        document.getElementById("resultado").innerHTML = `

        <div class="secao-titulo">
            <h2>Detalhe da Conferência</h2>
            <p class="secao-desc">${data}${dataPlanilhaTexto}</p>
        </div>

        <button class="botao-secundario" onclick="verHistorico()" style="margin-bottom:20px;">
            Voltar ao histórico
        </button>

        <div id="resultadoComparacao"></div>

        `;

        mostrarResultado(
            d.total,
            d.encontrados,
            comDesconto,
            comValorMinimo,
            d.divergencias,
            d.naoEncontrados
        );

    });

}



function configuracoes(){

    let usuario = firebase.auth().currentUser;
    let cfg = window.configUsuario || configuracaoPadrao();
    let temaAtual = localStorage.getItem("taxicheckTema") || "claro";

    document.getElementById("resultado").innerHTML = `

    <div class="secao-titulo">
        <h2>Configurações</h2>
        <p class="secao-desc">Ajustes da sua conta e da comparação de planilhas.</p>
    </div>


    <div class="tabela-card">

        <h3>Conta</h3>

        <p class="secao-desc" style="margin-bottom:16px;">
            Logado como <b>${usuario.email}</b>
        </p>

        <label class="upload-label">Nova senha</label>
        <input class="campo" type="password" id="novaSenha" placeholder="Mínimo 6 caracteres">

        <label class="upload-label">Confirmar nova senha</label>
        <input class="campo" type="password" id="confirmarSenha" placeholder="Repita a nova senha">

        <button class="botao-primario" onclick="atualizarSenha()">
            Atualizar senha
        </button>

        <p id="mensagemSenha" class="secao-desc" style="margin-top:10px;"></p>

    </div>


    <div class="tabela-card">

        <h3>Comparação de planilhas</h3>

        <label class="upload-label">Tolerância de divergência (R$)</label>
        <input class="campo" type="number" id="cfgTolerancia" step="0.01" min="0" value="${cfg.tolerancia}">

        <label class="upload-label">Nomes de coluna aceitos para "Número / Chamado"</label>
        <input class="campo" type="text" id="cfgAliasNumero" value="${cfg.aliasesNumero.join(', ')}">

        <label class="upload-label">Nomes de coluna aceitos para "Valor"</label>
        <input class="campo" type="text" id="cfgAliasValor" value="${cfg.aliasesValor.join(', ')}">

        <label class="upload-label">Nomes de coluna aceitos para "Cliente"</label>
        <input class="campo" type="text" id="cfgAliasCliente" value="${(cfg.aliasesCliente || configuracaoPadrao().aliasesCliente).join(', ')}">

        <p class="secao-desc">
            Separe vários nomes por vírgula. Não diferencia maiúsculas, espaços ou pontos.
        </p>

    </div>


    <div class="tabela-card">

        <h3>Histórico</h3>

        <label class="upload-label">Quantidade de registros exibidos</label>
        <input class="campo" type="number" id="cfgHistoricoLimite" min="1" max="200" value="${cfg.historicoLimite}">

        <button class="botao-secundario" style="border-color: var(--cor-erro); color: var(--cor-erro);" onclick="limparHistorico()">
            Limpar todo o histórico
        </button>

    </div>


    <div class="tabela-card">

        <h3>Aparência</h3>

        <div style="display:flex; gap:10px;">

            <button class="botao-secundario" id="botaoTemaClaro" onclick="alterarTema('claro')">
                Claro
            </button>

            <button class="botao-secundario" id="botaoTemaEscuro" onclick="alterarTema('escuro')">
                Escuro
            </button>

        </div>

    </div>


    <button class="botao-primario" onclick="salvarConfiguracoes()">
        Salvar configurações
    </button>

    <p id="mensagemConfig" class="secao-desc" style="margin-top:10px;"></p>

    `;

    marcarBotaoTemaAtivo(temaAtual);

}



function marcarBotaoTemaAtivo(tema){

    document.getElementById("botaoTemaClaro")
    .classList.toggle("botao-selecionado", tema !== "escuro");

    document.getElementById("botaoTemaEscuro")
    .classList.toggle("botao-selecionado", tema === "escuro");

}



function alterarTema(tema){

    localStorage.setItem("taxicheckTema", tema);

    document.body.classList.toggle("tema-escuro", tema === "escuro");

    marcarBotaoTemaAtivo(tema);

}



function atualizarSenha(){

    let nova = document.getElementById("novaSenha").value;
    let confirmar = document.getElementById("confirmarSenha").value;
    let mensagem = document.getElementById("mensagemSenha");

    mensagem.style.color = "var(--cor-erro)";
    mensagem.innerHTML = "";

    if(!nova || nova.length < 6){

        mensagem.innerHTML = "A senha deve ter pelo menos 6 caracteres";

        return;

    }

    if(nova !== confirmar){

        mensagem.innerHTML = "As senhas não coincidem";

        return;

    }

    firebase.auth().currentUser.updatePassword(nova)
    .then(function(){

        mensagem.style.color = "var(--cor-sucesso)";
        mensagem.innerHTML = "Senha atualizada com sucesso";

        document.getElementById("novaSenha").value = "";
        document.getElementById("confirmarSenha").value = "";

    })
    .catch(function(erro){

        if(erro.code === "auth/requires-recent-login"){

            mensagem.innerHTML = "Por segurança, saia e entre de novo antes de trocar a senha";

        } else {

            mensagem.innerHTML = "Não foi possível atualizar a senha";

        }

    });

}



function salvarConfiguracoes(){

    let tolerancia = parseFloat(document.getElementById("cfgTolerancia").value);

    let aliasesNumero = document.getElementById("cfgAliasNumero").value
        .split(",")
        .map(function(v){ return v.trim(); })
        .filter(Boolean);

    let aliasesValor = document.getElementById("cfgAliasValor").value
        .split(",")
        .map(function(v){ return v.trim(); })
        .filter(Boolean);

    let aliasesCliente = document.getElementById("cfgAliasCliente").value
        .split(",")
        .map(function(v){ return v.trim(); })
        .filter(Boolean);

    let historicoLimite = parseInt(document.getElementById("cfgHistoricoLimite").value);

    let mensagem = document.getElementById("mensagemConfig");

    mensagem.style.color = "var(--cor-erro)";

    if(isNaN(tolerancia) || tolerancia < 0){

        mensagem.innerHTML = "Tolerância inválida";

        return;

    }

    if(!aliasesNumero.length || !aliasesValor.length){

        mensagem.innerHTML = "Informe pelo menos um nome de coluna para Número e para Valor";

        return;

    }

    if(!aliasesCliente.length){

        aliasesCliente = configuracaoPadrao().aliasesCliente;

    }

    if(isNaN(historicoLimite) || historicoLimite < 1){

        historicoLimite = 30;

    }

    let novaConfig = {

        tolerancia: tolerancia,

        aliasesNumero: aliasesNumero,

        aliasesValor: aliasesValor,

        aliasesCliente: aliasesCliente,

        historicoLimite: historicoLimite

    };

    let uid = firebase.auth().currentUser.uid;

    db.collection("configuracoes").doc(uid).set(novaConfig)
    .then(function(){

        window.configUsuario = novaConfig;

        mensagem.style.color = "var(--cor-sucesso)";
        mensagem.innerHTML = "Configurações salvas";

    })
    .catch(function(erro){

        console.error("Erro ao salvar configurações:", erro);

        mensagem.innerHTML = "Não foi possível salvar as configurações";

    });

}



function limparHistorico(){

    if(!confirm("Isso vai apagar todo o histórico de comparações. Deseja continuar?")){

        return;

    }

    let uid = firebase.auth().currentUser.uid;

    db.collection("historico")
    .where("uid", "==", uid)
    .get()
    .then(function(snapshot){

        let lote = db.batch();

        snapshot.forEach(function(doc){

            lote.delete(doc.ref);

        });

        return lote.commit();

    })
    .then(function(){

        alert("Histórico apagado");

    })
    .catch(function(erro){

        console.error("Erro ao apagar histórico:", erro);

        alert("Não foi possível apagar o histórico");

    });

}



function clientes(){

    document.getElementById("resultado").innerHTML = `

    <div class="secao-titulo">
        <h2>Clientes e Descontos</h2>
        <p class="secao-desc">
            Cadastre aqui os clientes que têm desconto fixo e/ou tarifa mínima. Na hora de comparar, se a diferença de
            valor bater certinho com uma dessas regras, o TaxiCheck já reconhece como correto em vez de marcar como divergência.
        </p>
    </div>

    <div class="tabela-card">

        <h3>Novo cliente</h3>

        <label class="upload-label">Nome do cliente (exatamente como aparece na planilha)</label>
        <input class="campo" type="text" id="novoClienteNome" placeholder="Ex: Empresa XPTO Ltda">

        <label class="upload-label">Desconto (%) — deixe em branco se não tiver</label>
        <input class="campo" type="number" id="novoClienteDesconto" min="0" max="100" step="0.01" placeholder="Ex: 10">

        <label class="upload-label">Valor mínimo da corrida (R$) — deixe em branco se não tiver</label>
        <input class="campo" type="number" id="novoClienteValorMinimo" min="0" step="0.01" placeholder="Ex: 15">

        <p class="secao-desc" style="margin-top:-8px;">
            Use o valor mínimo quando esse cliente sempre paga pelo menos um valor fixo, mesmo se a corrida de referência for mais barata.
        </p>

        <button class="botao-primario" onclick="adicionarCliente()">
            Adicionar cliente
        </button>

        <p id="mensagemCliente" class="secao-desc" style="margin-top:10px;"></p>

    </div>

    <div class="tabela-card">

        <h3>Clientes cadastrados</h3>

        <div id="listaClientes">
            <p class="secao-desc">Carregando...</p>
        </div>

    </div>

    `;

    carregarListaClientes();

}



function carregarListaClientes(){

    let uid = firebase.auth().currentUser.uid;

    db.collection("clientes")
    .where("uid", "==", uid)
    .get()
    .then(function(snapshot){

        let lista = [];

        snapshot.forEach(function(doc){

            let d = doc.data();

            lista.push({

                id: doc.id,
                nome: d.nome,
                desconto: (d.desconto === undefined ? null : d.desconto),
                valorMinimo: (d.valorMinimo === undefined ? null : d.valorMinimo)

            });

        });

        lista.sort(function(a, b){

            return a.nome.localeCompare(b.nome, "pt-BR");

        });

        window.clientesUsuario = lista;

        if(lista.length === 0){

            document.getElementById("listaClientes").innerHTML = `

            <div class="status-info">
                <p>Nenhum cliente cadastrado ainda.</p>
            </div>

            `;

            return;

        }

        let html = `

        <table>
        <thead>
        <tr>
            <th>Cliente</th>
            <th>Desconto</th>
            <th>Valor mínimo</th>
            <th></th>
        </tr>
        </thead>
        <tbody>

        `;

        lista.forEach(function(c){

            html += `

            <tr>
                <td>${c.nome}</td>
                <td>${(c.desconto !== null && c.desconto !== undefined) ? formatarPercentual(c.desconto) : "-"}</td>
                <td>${(c.valorMinimo !== null && c.valorMinimo !== undefined) ? formatarMoeda(c.valorMinimo) : "-"}</td>
                <td>
                    <button class="botao-secundario" style="border-color: var(--cor-erro); color: var(--cor-erro);" onclick="excluirCliente('${c.id}')">
                        Excluir
                    </button>
                </td>
            </tr>

            `;

        });

        html += `</tbody></table>`;

        document.getElementById("listaClientes").innerHTML = html;

    })
    .catch(function(erro){

        console.error("Erro ao carregar clientes:", erro);

        document.getElementById("listaClientes").innerHTML = `

        <div class="status-info">
            <p>Não foi possível carregar os clientes.</p>
        </div>

        `;

    });

}



function adicionarCliente(){

    let nome = document.getElementById("novoClienteNome").value.trim();

    let descontoTexto = document.getElementById("novoClienteDesconto").value.trim();
    let valorMinimoTexto = document.getElementById("novoClienteValorMinimo").value.trim();

    let desconto = descontoTexto === "" ? null : parseFloat(descontoTexto);
    let valorMinimo = valorMinimoTexto === "" ? null : parseFloat(valorMinimoTexto);

    let mensagem = document.getElementById("mensagemCliente");

    mensagem.style.color = "var(--cor-erro)";

    if(!nome){

        mensagem.innerHTML = "Informe o nome do cliente";

        return;

    }

    if(desconto !== null && (isNaN(desconto) || desconto < 0 || desconto > 100)){

        mensagem.innerHTML = "Informe um desconto entre 0 e 100, ou deixe em branco";

        return;

    }

    if(valorMinimo !== null && (isNaN(valorMinimo) || valorMinimo < 0)){

        mensagem.innerHTML = "Informe um valor mínimo válido, ou deixe em branco";

        return;

    }

    if(desconto === null && valorMinimo === null){

        mensagem.innerHTML = "Preencha o desconto e/ou o valor mínimo";

        return;

    }

    let uid = firebase.auth().currentUser.uid;

    db.collection("clientes").add({

        uid: uid,
        nome: nome,
        desconto: desconto,
        valorMinimo: valorMinimo

    })
    .then(function(){

        mensagem.style.color = "var(--cor-sucesso)";
        mensagem.innerHTML = "Cliente adicionado";

        document.getElementById("novoClienteNome").value = "";
        document.getElementById("novoClienteDesconto").value = "";
        document.getElementById("novoClienteValorMinimo").value = "";

        carregarListaClientes();

    })
    .catch(function(erro){

        console.error("Erro ao adicionar cliente:", erro);

        mensagem.innerHTML = "Não foi possível adicionar o cliente";

    });

}



function excluirCliente(id){

    if(!confirm("Excluir esse cliente? Corridas dele passam a ser conferidas sem desconto.")){

        return;

    }

    db.collection("clientes").doc(id).delete()
    .then(function(){

        carregarListaClientes();

    })
    .catch(function(erro){

        console.error("Erro ao excluir cliente:", erro);

        alert("Não foi possível excluir o cliente");

    });

}



function organizarPlanilha(){

    document.getElementById("resultado").innerHTML = `

    <div class="secao-titulo">
        <h2>Organizar Planilha</h2>
        <p class="secao-desc">
            Envie a planilha exportada direto do sistema — o TaxiCheck localiza sozinho as colunas de número e valor (usando os mesmos nomes configurados em Configurações) e gera um arquivo já pronto pra usar em "Comparar Planilhas".
        </p>
    </div>

    <label class="upload-card" style="max-width:420px;">
        <span class="upload-label">Planilha bruta (exportada do sistema)</span>
        <input type="file" id="arquivoBruto" accept=".xlsx,.xls">
    </label>

    <button class="botao-primario" onclick="processarPlanilhaBruta()">
        Organizar Planilha
    </button>

    <div id="resultadoOrganizar" style="margin-top:24px;"></div>

    `;

}



function corrigirIntervaloPlanilha(planilha){

    let enderecos = Object.keys(planilha)
        .filter(function(chave){ return chave[0] !== "!"; });

    if(enderecos.length === 0){

        return;

    }

    let intervalo = {

        s: { r: Infinity, c: Infinity },
        e: { r: -Infinity, c: -Infinity }

    };

    enderecos.forEach(function(endereco){

        let celula = XLSX.utils.decode_cell(endereco);

        if(celula.r < intervalo.s.r) intervalo.s.r = celula.r;
        if(celula.r > intervalo.e.r) intervalo.e.r = celula.r;
        if(celula.c < intervalo.s.c) intervalo.s.c = celula.c;
        if(celula.c > intervalo.e.c) intervalo.e.c = celula.c;

    });

    planilha["!ref"] = XLSX.utils.encode_range(intervalo);

}



function processarPlanilhaBruta(){

    let arquivo = document.getElementById("arquivoBruto").files[0];

    if(!arquivo){

        alert("Selecione a planilha exportada do sistema");

        return;

    }

    let leitor = new FileReader();

    leitor.onload = function(e){

        let dados = new Uint8Array(e.target.result);

        let workbook = XLSX.read(dados, {type: "array"});

        let primeiraAba = workbook.SheetNames[0];

        let planilha = workbook.Sheets[primeiraAba];

        corrigirIntervaloPlanilha(planilha);

        let linhas = XLSX.utils.sheet_to_json(planilha, {header: 1, defval: ""});

        console.log("DEBUG - primeiras 15 linhas lidas:", linhas.slice(0, 15));

        let resultado = extrairColunasPlanilhaBruta(linhas);

        if(!resultado || !resultado.dados.length){

            document.getElementById("resultadoOrganizar").innerHTML = `

            <div class="status-info">
                <p>Não encontrei as colunas de número e valor nessa planilha. Confira em Configurações se os nomes de coluna aceitos batem com o cabeçalho do arquivo.</p>
            </div>

            `;

            return;

        }

        window.planilhaOrganizada = resultado.dados;

        mostrarPreviewOrganizada(resultado);

    };

    leitor.readAsArrayBuffer(arquivo);

}



function pareceValorValido(valor){

    if(valor === "" || valor === null || valor === undefined){

        return false;

    }

    let normalizado = valor
    .toString()
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(",", ".");

    return normalizado !== "" && !isNaN(Number(normalizado));

}



function extrairColunasPlanilhaBruta(linhas){

    let aliasesNumero = (window.configUsuario && window.configUsuario.aliasesNumero)
        || configuracaoPadrao().aliasesNumero;

    let aliasesValor = (window.configUsuario && window.configUsuario.aliasesValor)
        || configuracaoPadrao().aliasesValor;

    let aliasesCliente = (window.configUsuario && window.configUsuario.aliasesCliente)
        || configuracaoPadrao().aliasesCliente;

    for(let i = 0; i < Math.min(15, linhas.length); i++){

        let linha = linhas[i];

        if(!linha || !linha.length) continue;

        let indiceNumero = encontrarIndiceColuna(linha, aliasesNumero);
        let indiceValor = encontrarIndiceColuna(linha, aliasesValor);
        let indiceCliente = encontrarIndiceColuna(linha, aliasesCliente);

        if(indiceNumero !== -1 && indiceValor !== -1){

            let nomeColunaNumero = linha[indiceNumero];
            let nomeColunaValor = linha[indiceValor];
            let nomeColunaCliente = indiceCliente !== -1 ? linha[indiceCliente] : null;

            let dadosExtraidos = [];
            let ignoradas = 0;

            for(let l = i + 1; l < linhas.length; l++){

                let linhaDados = linhas[l];

                if(!linhaDados ||
                   linhaDados[indiceNumero] === undefined ||
                   linhaDados[indiceNumero] === "" ||
                   !pareceValorValido(linhaDados[indiceValor])){

                    if(linhaDados && linhaDados[indiceNumero] !== undefined && linhaDados[indiceNumero] !== ""){

                        ignoradas++;

                    }

                    continue;

                }

                let registro = {};

                registro[nomeColunaNumero] = linhaDados[indiceNumero];
                registro[nomeColunaValor] = linhaDados[indiceValor];

                if(indiceCliente !== -1){

                    registro[nomeColunaCliente] = linhaDados[indiceCliente];

                }

                dadosExtraidos.push(registro);

            }

            return {

                linhaCabecalho: i,
                colunaNumero: nomeColunaNumero,
                colunaValor: nomeColunaValor,
                colunaCliente: nomeColunaCliente,
                dados: dadosExtraidos,
                ignoradas: ignoradas

            };

        }

    }

    return null;

}



function mostrarPreviewOrganizada(resultado){

    let linhas = resultado.dados;
    let temCliente = !!resultado.colunaCliente;

    let linhasPreview = linhas.slice(0, 10).map(function(l){

        return `<tr>
            <td>${l[resultado.colunaNumero]}</td>
            ${temCliente ? `<td>${l[resultado.colunaCliente] || "-"}</td>` : ""}
            <td>${l[resultado.colunaValor]}</td>
        </tr>`;

    }).join("");

    document.getElementById("resultadoOrganizar").innerHTML = `

    <div class="status-info">
        <p>
            ✓ Encontrei o cabeçalho e extraí <b>${linhas.length}</b> corridas usando as colunas
            "<b>${resultado.colunaNumero}</b>"${temCliente ? `, "<b>${resultado.colunaCliente}</b>"` : ""} e "<b>${resultado.colunaValor}</b>".
            ${resultado.ignoradas > 0 ? `<br>${resultado.ignoradas} linha(s) sem um valor numérico válido foram ignoradas (agrupamentos, subtotais, cabeçalhos repetidos etc.).` : ""}
        </p>
    </div>

    <div class="tabela-card">

        <h3>Prévia (10 primeiras linhas)</h3>

        <table>

        <thead>
        <tr>
            <th>${resultado.colunaNumero}</th>
            ${temCliente ? `<th>${resultado.colunaCliente}</th>` : ""}
            <th>${resultado.colunaValor}</th>
        </tr>
        </thead>

        <tbody>
        ${linhasPreview}
        </tbody>

        </table>

    </div>

    <button class="botao-primario" onclick="baixarPlanilhaOrganizada()">
        Baixar planilha organizada
    </button>

    `;

}



function baixarPlanilhaOrganizada(){

    if(!window.planilhaOrganizada){

        alert("Organize uma planilha primeiro");

        return;

    }

    let planilha = XLSX.utils.json_to_sheet(window.planilhaOrganizada);

    let workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, planilha, "Planilha Organizada");

    XLSX.writeFile(workbook, "TaxiCheck_Planilha_Organizada.xlsx");

}



function comparar(){

    document.getElementById("resultado").innerHTML = `

    <div class="secao-titulo">
        <h2>Comparação de Planilhas</h2>
        <p class="secao-desc">
            Envie a planilha de referência e a de conferência para localizar divergências de valor.
        </p>
    </div>

    <div class="upload-grid">

        <label class="upload-card">
            <span class="upload-label">Planilha Referência</span>
            <input
                type="file"
                id="arquivoReferencia"
                accept=".xlsx,.xls">
        </label>

        <label class="upload-card">
            <span class="upload-label">Planilha Conferência</span>
            <input
                type="file"
                id="arquivoConferencia"
                accept=".xlsx,.xls">
        </label>

    </div>

    <label class="upload-label" for="dataPlanilha">Data da planilha conferida (opcional)</label>
    <input
        class="campo"
        style="max-width:220px;"
        type="date"
        id="dataPlanilha">

    <br>

    <button class="botao-primario" onclick="iniciarComparacao()">
        Iniciar Comparação
    </button>

    <div id="resultadoComparacao">

    </div>

    `;

}

function iniciarComparacao(){

    let referencia =
    document.getElementById("arquivoReferencia").files[0];


    let conferencia =
    document.getElementById("arquivoConferencia").files[0];


    if(!referencia || !conferencia){

        alert("Selecione as duas planilhas");

        return;

    }


    lerExcel(referencia, "referencia");

    lerExcel(conferencia, "conferencia");


}



function lerExcel(arquivo, tipo){

    let leitor = new FileReader();


    leitor.onload = function(e){

        let dados =
        new Uint8Array(e.target.result);


        let workbook =
        XLSX.read(dados, {type:"array"});


        let primeiraAba =
        workbook.SheetNames[0];


        let planilha =
        workbook.Sheets[primeiraAba];


        corrigirIntervaloPlanilha(planilha);


        let dadosExcel =
        XLSX.utils.sheet_to_json(planilha);


        console.log(tipo, dadosExcel);

        console.log("Cabeçalhos encontrados:", Object.keys(dadosExcel[0]));

        if(tipo === "referencia"){

            window.planilhaReferencia = dadosExcel;

        }


        if(tipo === "conferencia"){

            window.planilhaConferencia = dadosExcel;

        }


        verificarDadosCarregados();

    };


    leitor.readAsArrayBuffer(arquivo);

}



function verificarDadosCarregados(){

    if(window.planilhaReferencia &&
   window.planilhaConferencia){


    document.getElementById("resultadoComparacao")
    .innerHTML = `

    <div class="status-info">

        <p>✓ Planilhas carregadas com sucesso!</p>

        <button class="botao-primario" onclick="compararDados()">
            Executar Comparação
        </button>

    </div>

    `;

}

}

function normalizarNomeColuna(nome){

    return nome
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\./g, "")
    .replace(/\s+/g, "");

}



function encontrarIndiceColuna(linhaCabecalho, aliases){

    let aliasesNorm = aliases.map(normalizarNomeColuna);

    for(let i = 0; i < linhaCabecalho.length; i++){

        let nome = normalizarNomeColuna(linhaCabecalho[i] || "");

        if(aliasesNorm.indexOf(nome) !== -1){

            return i;

        }

    }

    return -1;

}



function encontrarColuna(cabecalho, aliases){

    let indice = encontrarIndiceColuna(cabecalho, aliases);

    return indice === -1 ? null : cabecalho[indice];

}



function encontrarColunaNumero(cabecalho){

    let aliases = (window.configUsuario && window.configUsuario.aliasesNumero)
        || configuracaoPadrao().aliasesNumero;

    return encontrarColuna(cabecalho, aliases);

}



function encontrarColunaValor(cabecalho){

    let aliases = (window.configUsuario && window.configUsuario.aliasesValor)
        || configuracaoPadrao().aliasesValor;

    return encontrarColuna(cabecalho, aliases);

}



function encontrarColunaCliente(cabecalho){

    let aliases = (window.configUsuario && window.configUsuario.aliasesCliente)
        || configuracaoPadrao().aliasesCliente;

    return encontrarColuna(cabecalho, aliases);

}

function correspondemChamados(valorRef, valorConf){

    let ref = (valorRef === null || valorRef === undefined) ? "" : valorRef.toString().trim();
    let conf = (valorConf === null || valorConf === undefined) ? "" : valorConf.toString().trim();

    if(ref === "" || conf === ""){

        return false;

    }

    if(ref === conf){

        return true;

    }

    // se o número de referência começa com letras (ex: TTB181910),
    // a conferência costuma trocar essas letras por um código numérico
    // fixo, mantendo o restante dos dígitos igual (ex: 882181910).
    // Nesse caso, compara só o "miolo" numérico final.

    let refSemLetras = ref.replace(/^[A-Za-z]+/, "");

    if(refSemLetras === ref || refSemLetras === ""){

        return false;

    }

    return conf.slice(-refSemLetras.length) === refSemLetras;

}



function compararDados(){

    let referencia = window.planilhaReferencia;
    let conferencia = window.planilhaConferencia;


    let encontrados = [];
let comDesconto = [];
let comValorMinimo = [];
let divergenciasValor = [];
let naoEncontrados = [];

const tolerancia = (window.configUsuario && typeof window.configUsuario.tolerancia === "number")
    ? window.configUsuario.tolerancia
    : configuracaoPadrao().tolerancia;


    let colunaNumeroRef =
    encontrarColunaNumero(Object.keys(referencia[0]));


    let colunaValorRef =
    encontrarColunaValor(Object.keys(referencia[0]));


    let colunaClienteRef =
    encontrarColunaCliente(Object.keys(referencia[0]));



    let colunaNumeroConf =
    encontrarColunaNumero(Object.keys(conferencia[0]));


    let colunaValorConf =
    encontrarColunaValor(Object.keys(conferencia[0]));


    let colunaClienteConf =
    encontrarColunaCliente(Object.keys(conferencia[0]));



    if(!colunaNumeroRef ||
       !colunaValorRef ||
       !colunaNumeroConf ||
       !colunaValorConf){

        alert("Não foi possível encontrar as colunas Numero/No.Chamado e Valor");

        return;

    }



    conferencia.forEach(linhaConf => {


       let resultadoLinha = null;


referencia.forEach(linhaRef => {


    if(
        correspondemChamados(
            linhaRef[colunaNumeroRef],
            linhaConf[colunaNumeroConf]
        )
    ){

        let valorReferencia =
        normalizarValor(linhaRef[colunaValorRef]);


        let valorConferencia =
        normalizarValor(linhaConf[colunaValorConf]);


        let diferenca =
        Math.abs(valorReferencia - valorConferencia);



        let percentual =
        valorReferencia > 0 ? (diferenca / valorReferencia) * 100 : 0;


        let cliente = colunaClienteConf
            ? linhaConf[colunaClienteConf]
            : (colunaClienteRef ? linhaRef[colunaClienteRef] : null);


        if(diferenca <= tolerancia){

            resultadoLinha = {

                tipo: "encontrado",
                valorReferencia,
                valorConferencia,
                diferenca,
                percentual,
                cliente

            };

        }else if(!resultadoLinha || (resultadoLinha.tipo !== "encontrado" && resultadoLinha.tipo !== "desconto" && resultadoLinha.tipo !== "minimo")){

            // a diferença pode ser explicada por um desconto
            // cadastrado pra esse cliente — se bater, não é divergência de verdade

            let desconto = buscarDescontoCliente(cliente);

            let resultadoCandidato = {

                tipo: "divergente",
                valorReferencia,
                valorConferencia,
                diferenca,
                percentual,
                cliente

            };

            if(desconto !== null){

                let valorEsperado = valorReferencia * (1 - (desconto / 100));

                let diferencaComDesconto =
                Math.abs(valorEsperado - valorConferencia);

                if(diferencaComDesconto <= tolerancia){

                    resultadoCandidato = {

                        tipo: "desconto",
                        valorReferencia,
                        valorConferencia,
                        valorEsperado,
                        desconto,
                        diferenca: diferencaComDesconto,
                        percentual: valorEsperado > 0
                            ? (diferencaComDesconto / valorEsperado) * 100
                            : 0,
                        cliente

                    };

                }

            }

            // se o desconto não explicou a diferença, tenta a tarifa mínima:
            // corridas abaixo do valor mínimo do cliente são cobradas pelo mínimo

            if(resultadoCandidato.tipo === "divergente"){

                let valorMinimo = buscarValorMinimoCliente(cliente);

                if(valorMinimo !== null && valorReferencia < valorMinimo){

                    let diferencaMinimo =
                    Math.abs(valorMinimo - valorConferencia);

                    if(diferencaMinimo <= tolerancia){

                        resultadoCandidato = {

                            tipo: "minimo",
                            valorReferencia,
                            valorConferencia,
                            valorMinimo,
                            diferenca: diferencaMinimo,
                            percentual: valorMinimo > 0
                                ? (diferencaMinimo / valorMinimo) * 100
                                : 0,
                            cliente

                        };

                    }

                }

            }

            resultadoLinha = resultadoCandidato;

        }

    }


});



let chamado = linhaConf[colunaNumeroConf];


if(resultadoLinha && resultadoLinha.tipo === "encontrado"){

    encontrados.push(Object.assign({chamado}, resultadoLinha));


}else if(resultadoLinha && resultadoLinha.tipo === "desconto"){

    comDesconto.push(Object.assign({chamado}, resultadoLinha));


}else if(resultadoLinha && resultadoLinha.tipo === "minimo"){

    comValorMinimo.push(Object.assign({chamado}, resultadoLinha));


}else if(resultadoLinha && resultadoLinha.tipo === "divergente"){

    divergenciasValor.push(Object.assign({chamado}, resultadoLinha));


}else{

    naoEncontrados.push({

        chamado,

        valorConferencia: normalizarValor(linhaConf[colunaValorConf]),

        cliente: colunaClienteConf ? linhaConf[colunaClienteConf] : null

    });

}


    });



    let campoData = document.getElementById("dataPlanilha");
    let dataPlanilha = campoData ? campoData.value : "";


    window.resultadoTaxiCheck = {

    total: conferencia.length,

    dataPlanilha: dataPlanilha,

    encontrados: encontrados,

    comDesconto: comDesconto,

    comValorMinimo: comValorMinimo,

    divergencias: divergenciasValor,

    naoEncontrados: naoEncontrados

};


window.conferidosAtual = {};
window.idHistoricoAtual = null;


mostrarResultado(
    conferencia.length,
    encontrados,
    comDesconto,
    comValorMinimo,
    divergenciasValor,
    naoEncontrados
);


salvarHistorico(window.resultadoTaxiCheck);


}



function salvarHistorico(dados){

    let uid = firebase.auth().currentUser.uid;

    db.collection("historico").add({

        uid: uid,

        dataHora: firebase.firestore.FieldValue.serverTimestamp(),

        dataPlanilha: dados.dataPlanilha || "",

        total: dados.total,

        encontrados: dados.encontrados,

        comDesconto: dados.comDesconto || [],

        comValorMinimo: dados.comValorMinimo || [],

        divergencias: dados.divergencias,

        naoEncontrados: dados.naoEncontrados,

        conferidos: {}

    })
    .then(function(referenciaDoc){

        window.idHistoricoAtual = referenciaDoc.id;

    })
    .catch(function(erro){

        console.error("Erro ao salvar histórico:", erro);

    });

}




function estaConferido(chamado){

    let mapa = window.conferidosAtual || {};

    return !!mapa[String(chamado)];

}



function montarLinhasResultado(encontrados, comDesconto, comValorMinimo, divergencias, naoEncontrados){

    let linhas = [];

    encontrados.forEach(function(item){

        linhas.push({

            chamado: item.chamado,
            cliente: item.cliente || null,
            valorReferencia: item.valorReferencia,
            valorConferencia: item.valorConferencia,
            diferenca: item.diferenca,
            percentual: item.percentual,
            desconto: null,
            valorMinimo: null,
            conferido: estaConferido(item.chamado),
            status: "ok"

        });

    });

    comDesconto.forEach(function(item){

        linhas.push({

            chamado: item.chamado,
            cliente: item.cliente || null,
            valorReferencia: item.valorReferencia,
            valorConferencia: item.valorConferencia,
            diferenca: item.diferenca,
            percentual: item.percentual,
            desconto: item.desconto,
            valorMinimo: null,
            conferido: estaConferido(item.chamado),
            status: "desconto"

        });

    });

    comValorMinimo.forEach(function(item){

        linhas.push({

            chamado: item.chamado,
            cliente: item.cliente || null,
            valorReferencia: item.valorReferencia,
            valorConferencia: item.valorConferencia,
            diferenca: item.diferenca,
            percentual: item.percentual,
            desconto: null,
            valorMinimo: item.valorMinimo,
            conferido: estaConferido(item.chamado),
            status: "minimo"

        });

    });

    divergencias.forEach(function(item){

        linhas.push({

            chamado: item.chamado,
            cliente: item.cliente || null,
            valorReferencia: item.valorReferencia,
            valorConferencia: item.valorConferencia,
            diferenca: item.diferenca,
            percentual: item.percentual,
            desconto: null,
            valorMinimo: null,
            conferido: estaConferido(item.chamado),
            status: "divergencia"

        });

    });

    naoEncontrados.forEach(function(item){

        linhas.push({

            chamado: item.chamado,
            cliente: item.cliente || null,
            valorReferencia: null,
            valorConferencia: item.valorConferencia !== undefined ? item.valorConferencia : item.valor,
            diferenca: null,
            percentual: null,
            desconto: null,
            valorMinimo: null,
            status: "nao-encontrado"

        });

    });

    return linhas;

}



function badgeStatus(linha){

    if(linha.status === "ok"){

        return '<span class="badge badge-sucesso">Encontrado</span>';

    }

    if(linha.status === "desconto"){

        return `<span class="badge badge-info">Desconto ${formatarPercentual(linha.desconto)}</span>`;

    }

    if(linha.status === "minimo"){

        return `<span class="badge badge-info">Tarifa mínima ${formatarMoeda(linha.valorMinimo)}</span>`;

    }

    if(linha.status === "divergencia"){

        return '<span class="badge badge-alerta">Divergência</span>';

    }

    return '<span class="badge badge-erro">Não encontrado</span>';

}



function filtrarResultado(status){

    window.filtroResultadoAtual = status;

    let mapaId = {

        "todos": "filtroTodos",
        "ok": "filtroOk",
        "desconto": "filtroDesconto",
        "minimo": "filtroMinimo",
        "divergencia": "filtroDivergencia",
        "nao-encontrado": "filtroNaoEncontrado"

    };

    Object.keys(mapaId).forEach(function(chave){

        let el = document.getElementById(mapaId[chave]);

        if(el){

            el.classList.toggle("botao-selecionado", chave === status);

        }

    });

    renderizarTabelaResultado();

}



function pesquisarResultado(texto){

    window.pesquisaResultadoAtual = texto.trim().toLowerCase();

    renderizarTabelaResultado();

}



function renderizarTabelaResultado(){

    let linhas = window.linhasResultadoAtual || [];

    let filtro = window.filtroResultadoAtual || "todos";
    let pesquisa = window.pesquisaResultadoAtual || "";

    let filtradas = linhas.filter(function(l){

        if(filtro !== "todos" && l.status !== filtro){

            return false;

        }

        if(pesquisa){

            let alvo = (l.chamado.toString() + " " + (l.cliente || "")).toLowerCase();

            if(alvo.indexOf(pesquisa) === -1){

                return false;

            }

        }

        return true;

    });

    let corpo = document.getElementById("corpoTabelaResultado");
    let mensagemVazia = document.getElementById("mensagemTabelaVazia");

    if(!corpo){

        return;

    }

    if(filtradas.length === 0){

        corpo.innerHTML = "";

        if(mensagemVazia){

            mensagemVazia.classList.remove("escondido");

        }

        return;

    }

    if(mensagemVazia){

        mensagemVazia.classList.add("escondido");

    }

    corpo.innerHTML = filtradas.map(function(l){

        return `<tr class="linha-${l.status}">
            <td class="celula-check">
                <input
                    type="checkbox"
                    class="check-conferido"
                    data-chamado="${l.chamado}"
                    ${l.conferido ? "checked" : ""}
                    onchange="marcarConferido(this)">
            </td>
            <td>${badgeStatus(l)}</td>
            <td>${l.chamado}</td>
            <td>${l.cliente || "-"}</td>
            <td>${l.valorReferencia !== null && l.valorReferencia !== undefined ? formatarMoeda(l.valorReferencia) : "-"}</td>
            <td>${l.valorConferencia !== null && l.valorConferencia !== undefined ? formatarMoeda(l.valorConferencia) : "-"}</td>
            <td>${l.diferenca !== null && l.diferenca !== undefined ? formatarMoeda(l.diferenca) : "-"}</td>
            <td>${l.percentual !== null && l.percentual !== undefined ? formatarPercentual(l.percentual) : "-"}</td>
        </tr>`;

    }).join("");

    atualizarProgressoConferido();

}



function atualizarProgressoConferido(){

    let progresso = document.getElementById("progressoConferido");

    if(!progresso){

        return;

    }

    let linhas = window.linhasResultadoAtual || [];

    let total = linhas.length;
    let feitas = linhas.filter(function(l){ return l.conferido; }).length;

    progresso.innerHTML = `${feitas} de ${total} conferidas`;

}



function marcarConferido(checkbox){

    let chamado = checkbox.dataset.chamado;
    let valor = checkbox.checked;

    (window.linhasResultadoAtual || []).forEach(function(l){

        if(String(l.chamado) === String(chamado)){

            l.conferido = valor;

        }

    });

    window.conferidosAtual = window.conferidosAtual || {};
    window.conferidosAtual[String(chamado)] = valor;

    atualizarProgressoConferido();

    if(!window.idHistoricoAtual){

        return;

    }

    let campoAtualizado = {};
    campoAtualizado["conferidos." + String(chamado)] = valor;

    db.collection("historico").doc(window.idHistoricoAtual).update(campoAtualizado)
    .catch(function(erro){

        console.error("Erro ao salvar marcação de conferido:", erro);

    });

}



function mostrarResultado(total, encontrados, comDesconto, comValorMinimo, divergenciasValor, naoEncontrados, destino){

    destino = destino || "resultadoComparacao";

    window.linhasResultadoAtual = montarLinhasResultado(encontrados, comDesconto, comValorMinimo, divergenciasValor, naoEncontrados);
    window.filtroResultadoAtual = "todos";
    window.pesquisaResultadoAtual = "";

    let html = `

    <div class="secao-titulo">
        <h2>Resultado da Conferência</h2>
    </div>

    <div class="stats-grid">

        <div class="stat-card stat-total">
            <span class="stat-label">Total analisado</span>
            <span class="stat-valor">${total}</span>
        </div>

        <div class="stat-card stat-sucesso">
            <span class="stat-label">Encontrados</span>
            <span class="stat-valor">${encontrados.length}</span>
        </div>

        <div class="stat-card stat-info">
            <span class="stat-label">Desconto aplicado</span>
            <span class="stat-valor">${comDesconto.length}</span>
        </div>

        <div class="stat-card stat-info">
            <span class="stat-label">Tarifa mínima</span>
            <span class="stat-valor">${comValorMinimo.length}</span>
        </div>

        <div class="stat-card stat-alerta">
            <span class="stat-label">Divergência de valor</span>
            <span class="stat-valor">${divergenciasValor.length}</span>
        </div>

        <div class="stat-card stat-erro">
            <span class="stat-label">Não encontrados</span>
            <span class="stat-valor">${naoEncontrados.length}</span>
        </div>

    </div>

    <div class="tabela-card">

        <div class="tabela-controles">

            <div class="filtro-grupo">

                <button class="botao-secundario botao-selecionado" id="filtroTodos" onclick="filtrarResultado('todos')">
                    Todos (${window.linhasResultadoAtual.length})
                </button>

                <button class="botao-secundario" id="filtroOk" onclick="filtrarResultado('ok')">
                    Encontrados (${encontrados.length})
                </button>

                <button class="botao-secundario" id="filtroDesconto" onclick="filtrarResultado('desconto')">
                    Desconto aplicado (${comDesconto.length})
                </button>

                <button class="botao-secundario" id="filtroMinimo" onclick="filtrarResultado('minimo')">
                    Tarifa mínima (${comValorMinimo.length})
                </button>

                <button class="botao-secundario" id="filtroDivergencia" onclick="filtrarResultado('divergencia')">
                    Divergência (${divergenciasValor.length})
                </button>

                <button class="botao-secundario" id="filtroNaoEncontrado" onclick="filtrarResultado('nao-encontrado')">
                    Não encontrados (${naoEncontrados.length})
                </button>

            </div>

            <input
                class="campo campo-busca"
                type="text"
                id="pesquisaChamado"
                placeholder="Buscar por chamado ou cliente..."
                oninput="pesquisarResultado(this.value)">

            <span id="progressoConferido" class="secao-desc" style="white-space:nowrap;"></span>

        </div>

        <table>

        <thead>
        <tr>
            <th>Conferido</th>
            <th>Status</th>
            <th>Chamado</th>
            <th>Cliente</th>
            <th>Referência</th>
            <th>Conferência</th>
            <th>Diferença</th>
            <th>%</th>
        </tr>
        </thead>

        <tbody id="corpoTabelaResultado">
        </tbody>

        </table>

        <p id="mensagemTabelaVazia" class="secao-desc escondido" style="margin-top:14px;">
            Nenhum resultado para esse filtro/pesquisa.
        </p>

    </div>

    <button class="botao-secundario" onclick="exportarExcel()">
        Exportar Excel
    </button>

    `;

    document.getElementById(destino)
    .innerHTML = html;

    renderizarTabelaResultado();

}

function normalizarValor(valor){

    if(valor === null || valor === undefined){
        return 0;
    }


    let numero = valor
    .toString()
    .replace("R$","")
    .replace(/\s/g,"")
    .replace(",",".")
    .trim();


    return Number(numero);

}

function formatarMoeda(valor){

    return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

}


function formatarPercentual(valor){

    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + "%";

}


function formatarDataBR(data){

    if(!data) return "-";

    if(data.toDate){
        data = data.toDate();
    }else if(typeof data === "string"){
        const partes = data.split("-");
        if(partes.length === 3){
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        data = new Date(data);
    }else{
        data = new Date(data);
    }

    if(isNaN(data.getTime())) return "-";

    return data.toLocaleDateString("pt-BR");
}

function exportarExcel(){

    if(!window.resultadoTaxiCheck){

        alert("Faça uma comparação primeiro");

        return;

    }


    let dados = window.resultadoTaxiCheck;
    let comDesconto = dados.comDesconto || [];
    let comValorMinimo = dados.comValorMinimo || [];


    let divergencias = dados.divergencias.map(item => ({

        "Chamado": item.chamado,

        "Cliente": item.cliente || "",

        "Valor Referência": item.valorReferencia,

        "Valor Conferência": item.valorConferencia,

        "Diferença": item.diferenca,

        "Percentual": item.percentual / 100

    }));

let encontrados = dados.encontrados.map(item => ({

    "Chamado": item.chamado,

    "Cliente": item.cliente || "",

    "Valor Referência": item.valorReferencia !== undefined ? item.valorReferencia : "",

    "Valor Conferência": item.valorConferencia !== undefined ? item.valorConferencia : item.valor,

    "Status": "OK"

}));

    let comDescontoExport = comDesconto.map(item => ({

        "Chamado": item.chamado,

        "Cliente": item.cliente || "",

        "Desconto": item.desconto / 100,

        "Valor Referência": item.valorReferencia,

        "Valor Esperado (c/ desconto)": item.valorEsperado,

        "Valor Conferência": item.valorConferencia,

        "Diferença": item.diferenca,

        "Percentual": item.percentual / 100

    }));

    let comValorMinimoExport = comValorMinimo.map(item => ({

        "Chamado": item.chamado,

        "Cliente": item.cliente || "",

        "Valor Referência": item.valorReferencia,

        "Tarifa Mínima": item.valorMinimo,

        "Valor Conferência": item.valorConferencia,

        "Diferença": item.diferenca,

        "Percentual": item.percentual / 100

    }));

    let naoEncontrados = dados.naoEncontrados.map(item => ({

    "Chamado": item.chamado,

    "Cliente": item.cliente || "",

    "Valor": item.valorConferencia !== undefined ? item.valorConferencia : item.valor

}));



    let workbook = XLSX.utils.book_new();



    let abaResumo =
XLSX.utils.aoa_to_sheet([

    ["TaxiCheck - Relatório de Conferência"],

    [],

    ["Informação", "Quantidade"],

    ["Total analisado", dados.total],

    ["Encontrados", dados.encontrados.length],

    ["Desconto aplicado", comDesconto.length],

    ["Tarifa mínima aplicada", comValorMinimo.length],

    ["Divergência de valor", dados.divergencias.length],

    ["Não encontrados", dados.naoEncontrados.length],

    [],

    ["Gerado em:", new Date().toLocaleString("pt-BR")]

]);

abaResumo["!cols"] = [
    {wch:30},
    {wch:20}
];

    let abaDivergencias =
    XLSX.utils.json_to_sheet(divergencias);

    let abaEncontrados =
XLSX.utils.json_to_sheet(encontrados);


    let abaComDesconto =
    XLSX.utils.json_to_sheet(comDescontoExport);


    let abaComValorMinimo =
    XLSX.utils.json_to_sheet(comValorMinimoExport);


    let abaNaoEncontrados =
    XLSX.utils.json_to_sheet(naoEncontrados);



    // Ajuste de largura das colunas

    abaResumo["!cols"] = [
        {wch:25},
        {wch:15}
    ];


    abaDivergencias["!cols"] = [
        {wch:15},
        {wch:26},
        {wch:18},
        {wch:18},
        {wch:15},
        {wch:12}
    ];

    abaEncontrados["!cols"] = [
    {wch:18},
    {wch:26},
    {wch:18},
    {wch:18},
    {wch:12}
];

    abaComDesconto["!cols"] = [
        {wch:15},
        {wch:26},
        {wch:12},
        {wch:18},
        {wch:22},
        {wch:18},
        {wch:15},
        {wch:12}
    ];

    abaComValorMinimo["!cols"] = [
        {wch:15},
        {wch:26},
        {wch:18},
        {wch:16},
        {wch:18},
        {wch:15},
        {wch:12}
    ];

    abaNaoEncontrados["!cols"] = [
        {wch:18},
        {wch:26},
        {wch:18}
    ];



    // Formatação de moeda (Divergências: C, D, E valores | F percentual)

    for(let linha = 1; linha <= dados.divergencias.length; linha++){

        abaDivergencias[
            "C" + (linha+1)
        ].z = '"R$" #,##0.00';


        abaDivergencias[
            "D" + (linha+1)
        ].z = '"R$" #,##0.00';


        abaDivergencias[
            "E" + (linha+1)
        ].z = '"R$" #,##0.00';


        abaDivergencias[
            "F" + (linha+1)
        ].z = '0.00%';

    }



    // Moeda encontrados (C, D)

    for(let linha = 1; linha <= dados.encontrados.length; linha++){

        if(abaEncontrados["C"+(linha+1)]){

            abaEncontrados["C"+(linha+1)].z = '"R$" #,##0.00';

        }

        if(abaEncontrados["D"+(linha+1)]){

            abaEncontrados["D"+(linha+1)].z = '"R$" #,##0.00';

        }

    }



    // Desconto aplicado (C percentual, D/E/F valores, G valor, H percentual)

    for(let linha = 1; linha <= comDesconto.length; linha++){

        if(abaComDesconto["C"+(linha+1)]) abaComDesconto["C"+(linha+1)].z = '0.00%';
        if(abaComDesconto["D"+(linha+1)]) abaComDesconto["D"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComDesconto["E"+(linha+1)]) abaComDesconto["E"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComDesconto["F"+(linha+1)]) abaComDesconto["F"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComDesconto["G"+(linha+1)]) abaComDesconto["G"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComDesconto["H"+(linha+1)]) abaComDesconto["H"+(linha+1)].z = '0.00%';

    }



    // Tarifa mínima aplicada (C/D/E valores, F valor, G percentual)

    for(let linha = 1; linha <= comValorMinimo.length; linha++){

        if(abaComValorMinimo["C"+(linha+1)]) abaComValorMinimo["C"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComValorMinimo["D"+(linha+1)]) abaComValorMinimo["D"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComValorMinimo["E"+(linha+1)]) abaComValorMinimo["E"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComValorMinimo["F"+(linha+1)]) abaComValorMinimo["F"+(linha+1)].z = '"R$" #,##0.00';
        if(abaComValorMinimo["G"+(linha+1)]) abaComValorMinimo["G"+(linha+1)].z = '0.00%';

    }



    // Moeda não encontrados (C)

    for(let linha = 1; linha <= dados.naoEncontrados.length; linha++){

        if(
            abaNaoEncontrados["C"+(linha+1)]
        ){

            abaNaoEncontrados[
                "C"+(linha+1)
            ].z = '"R$" #,##0.00';

        }

    }



    // Filtros

    abaDivergencias["!autofilter"] = {
        ref:"A1:F" + (dados.divergencias.length+1)
    };


    abaComDesconto["!autofilter"] = {
        ref:"A1:H" + (comDesconto.length+1)
    };


    abaComValorMinimo["!autofilter"] = {
        ref:"A1:G" + (comValorMinimo.length+1)
    };


    abaNaoEncontrados["!autofilter"] = {
        ref:"A1:C" + (dados.naoEncontrados.length+1)
    };

XLSX.utils.book_append_sheet(
    workbook,
    abaEncontrados,
    "Encontrados"
);

    XLSX.utils.book_append_sheet(
        workbook,
        abaResumo,
        "Resumo"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        abaComDesconto,
        "Desconto Aplicado"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        abaComValorMinimo,
        "Tarifa Mínima"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        abaDivergencias,
        "Divergências"
    );


    XLSX.utils.book_append_sheet(
        workbook,
        abaNaoEncontrados,
        "Não encontrados"
    );



    XLSX.writeFile(
        workbook,
        "TaxiCheck_Relatorio.xlsx"
    );


}