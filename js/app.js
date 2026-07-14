
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

            html += `

            <tr>
                <td>${data}</td>
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

        window.resultadoTaxiCheck = {

            total: d.total,

            encontrados: d.encontrados,

            divergencias: d.divergencias,

            naoEncontrados: d.naoEncontrados

        };

        let data = d.dataHora
            ? d.dataHora.toDate().toLocaleString("pt-BR")
            : "";

        document.getElementById("resultado").innerHTML = `

        <div class="secao-titulo">
            <h2>Detalhe da Conferência</h2>
            <p class="secao-desc">${data}</p>
        </div>

        <button class="botao-secundario" onclick="verHistorico()" style="margin-bottom:20px;">
            Voltar ao histórico
        </button>

        <div id="resultadoComparacao"></div>

        `;

        mostrarResultado(
            d.total,
            d.encontrados,
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

    if(isNaN(historicoLimite) || historicoLimite < 1){

        historicoLimite = 30;

    }

    let novaConfig = {

        tolerancia: tolerancia,

        aliasesNumero: aliasesNumero,

        aliasesValor: aliasesValor,

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

        let linhas = XLSX.utils.sheet_to_json(planilha, {header: 1, defval: ""});

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

    console.log("DEBUG - primeiras 15 linhas lidas:", linhas.slice(0, 15));

    let aliasesNumero = (window.configUsuario && window.configUsuario.aliasesNumero)
        || configuracaoPadrao().aliasesNumero;

    let aliasesValor = (window.configUsuario && window.configUsuario.aliasesValor)
        || configuracaoPadrao().aliasesValor;

    for(let i = 0; i < Math.min(15, linhas.length); i++){

        let linha = linhas[i];

        if(!linha || !linha.length) continue;

        let indiceNumero = encontrarIndiceColuna(linha, aliasesNumero);
        let indiceValor = encontrarIndiceColuna(linha, aliasesValor);

        if(indiceNumero !== -1 && indiceValor !== -1){

            let nomeColunaNumero = linha[indiceNumero];
            let nomeColunaValor = linha[indiceValor];

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

                dadosExtraidos.push(registro);

            }

            return {

                linhaCabecalho: i,
                colunaNumero: nomeColunaNumero,
                colunaValor: nomeColunaValor,
                dados: dadosExtraidos,
                ignoradas: ignoradas

            };

        }

    }

    return null;

}



function mostrarPreviewOrganizada(resultado){

    let linhas = resultado.dados;

    let linhasPreview = linhas.slice(0, 10).map(function(l){

        return `<tr>
            <td>${l[resultado.colunaNumero]}</td>
            <td>${l[resultado.colunaValor]}</td>
        </tr>`;

    }).join("");

    document.getElementById("resultadoOrganizar").innerHTML = `

    <div class="status-info">
        <p>
            ✓ Encontrei o cabeçalho e extraí <b>${linhas.length}</b> corridas usando as colunas
            "<b>${resultado.colunaNumero}</b>" e "<b>${resultado.colunaValor}</b>".
            ${resultado.ignoradas > 0 ? `<br>${resultado.ignoradas} linha(s) sem um valor numérico válido foram ignoradas (agrupamentos, subtotais, cabeçalhos repetidos etc.).` : ""}
        </p>
    </div>

    <div class="tabela-card">

        <h3>Prévia (10 primeiras linhas)</h3>

        <table>

        <thead>
        <tr>
            <th>${resultado.colunaNumero}</th>
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



function encontrarColunaNumero(cabecalho){

    let aliases = (window.configUsuario && window.configUsuario.aliasesNumero)
        || configuracaoPadrao().aliasesNumero;

    aliases = aliases.map(normalizarNomeColuna);

    for(let coluna of cabecalho){

        let nome = normalizarNomeColuna(coluna);

        if(aliases.indexOf(nome) !== -1){

            return coluna;

        }

    }


    return null;

}



function encontrarColunaValor(cabecalho){

    let aliases = (window.configUsuario && window.configUsuario.aliasesValor)
        || configuracaoPadrao().aliasesValor;

    aliases = aliases.map(normalizarNomeColuna);

    for(let coluna of cabecalho){

        let nome = normalizarNomeColuna(coluna);

        if(aliases.indexOf(nome) !== -1){

            return coluna;

        }

    }


    return null;

}

function compararDados(){

    let referencia = window.planilhaReferencia;
    let conferencia = window.planilhaConferencia;


    let encontrados = [];
let divergenciasValor = [];
let naoEncontrados = [];

const tolerancia = (window.configUsuario && typeof window.configUsuario.tolerancia === "number")
    ? window.configUsuario.tolerancia
    : configuracaoPadrao().tolerancia;


    let colunaNumeroRef =
    encontrarColunaNumero(Object.keys(referencia[0]));


    let colunaValorRef =
    encontrarColunaValor(Object.keys(referencia[0]));



    let colunaNumeroConf =
    encontrarColunaNumero(Object.keys(conferencia[0]));


    let colunaValorConf =
    encontrarColunaValor(Object.keys(conferencia[0]));



    if(!colunaNumeroRef ||
       !colunaValorRef ||
       !colunaNumeroConf ||
       !colunaValorConf){

        alert("Não foi possível encontrar as colunas Numero/No.Chamado e Valor");

        return;

    }



    conferencia.forEach(linhaConf => {


       let encontrado = false;
let divergencia = null;


referencia.forEach(linhaRef => {


    if(
        linhaRef[colunaNumeroRef] ==
        linhaConf[colunaNumeroConf]
    ){

        let valorReferencia =
        normalizarValor(linhaRef[colunaValorRef]);


        let valorConferencia =
        normalizarValor(linhaConf[colunaValorConf]);


        let diferenca =
        Math.abs(valorReferencia - valorConferencia);



        let percentual =
        (diferenca / valorReferencia) * 100;



        if(diferenca <= tolerancia){

            encontrado = true;

        }else{

            divergencia = {

                chamado:
                linhaConf[colunaNumeroConf],

                valorReferencia,

                valorConferencia,

                diferenca,

                percentual

            };

        }

    }


});



if(encontrado){

    encontrados.push(linhaConf);


}else if(divergencia){

    divergenciasValor.push(divergencia);


}else{

    naoEncontrados.push(linhaConf);

}


    });



    window.resultadoTaxiCheck = {

    total: conferencia.length,

    encontrados: encontrados.map(item => ({

        chamado: item[colunaNumeroConf],

        valor: normalizarValor(item[colunaValorConf])

    })),

    divergencias: divergenciasValor,

    naoEncontrados: naoEncontrados.map(item => ({

        chamado: item[colunaNumeroConf],

        valor: normalizarValor(item[colunaValorConf])

    }))

};


mostrarResultado(
    conferencia.length,
    encontrados,
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

        total: dados.total,

        encontrados: dados.encontrados,

        divergencias: dados.divergencias,

        naoEncontrados: dados.naoEncontrados

    })
    .catch(function(erro){

        console.error("Erro ao salvar histórico:", erro);

    });

}




function mostrarResultado(total, encontrados, divergenciasValor, naoEncontrados, destino){

    destino = destino || "resultadoComparacao";


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

        <div class="stat-card stat-alerta">
            <span class="stat-label">Divergência de valor</span>
            <span class="stat-valor">${divergenciasValor.length}</span>
        </div>

        <div class="stat-card stat-erro">
            <span class="stat-label">Não encontrados</span>
            <span class="stat-valor">${naoEncontrados.length}</span>
        </div>

    </div>

    `;



    if(divergenciasValor.length > 0){


        html += `

        <div class="tabela-card">

        <h3>Divergências de valor</h3>


        <table>

        <thead>

        <tr>
            <th>Chamado</th>
            <th>Referência</th>
            <th>Conferência</th>
            <th>Diferença</th>
            <th>%</th>
        </tr>

        </thead>


        <tbody>

        `;


        divergenciasValor.forEach(item=>{


            html += `

            <tr>

            <td>${item.chamado}</td>

            <td>
            ${formatarMoeda(item.valorReferencia)}
            </td>


            <td>
            ${formatarMoeda(item.valorConferencia)}
            </td>


            <td>
            ${formatarMoeda(item.diferenca)}
            </td>


            <td>
            ${formatarPercentual(item.percentual)}
            </td>


            </tr>


            `;


        });



        html += `

        </tbody>

        </table>

        </div>

        `;


    }



    html += `

<button class="botao-secundario" onclick="exportarExcel()">
    Exportar Excel
</button>

`;

document.getElementById(destino)
.innerHTML = html;


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

function exportarExcel(){

    if(!window.resultadoTaxiCheck){

        alert("Faça uma comparação primeiro");

        return;

    }


    let dados = window.resultadoTaxiCheck;


    let resumo = [

        {
            "Informação":"Total analisado",
            "Quantidade":dados.total
        },

        {
            "Informação":"Encontrados",
            "Quantidade":dados.encontrados.length
        },

        {
            "Informação":"Divergência de valor",
            "Quantidade":dados.divergencias.length
        },

        {
            "Informação":"Não encontrados",
            "Quantidade":dados.naoEncontrados.length
        }

    ];



    let divergencias = dados.divergencias.map(item => ({

        "Chamado": item.chamado,

        "Valor Referência": item.valorReferencia,

        "Valor Conferência": item.valorConferencia,

        "Diferença": item.diferenca,

        "Percentual": item.percentual / 100

    }));

let encontrados = dados.encontrados.map(item => ({

    "Chamado": item.chamado,

    "Valor": item.valor,

    "Status": "OK"

}));

    let naoEncontrados = dados.naoEncontrados.map(item => ({

    "Chamado": item.chamado,

    "Valor": item.valor

}));



    let workbook = XLSX.utils.book_new();



    let abaResumo =
XLSX.utils.aoa_to_sheet([

    ["TaxiCheck - Relatório de Conferência"],

    [],

    ["Informação", "Quantidade"],

    ["Total analisado", dados.total],

    ["Encontrados", dados.encontrados.length],

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


    let abaNaoEncontrados =
    XLSX.utils.json_to_sheet(naoEncontrados);



    // Ajuste de largura das colunas

    abaResumo["!cols"] = [
        {wch:25},
        {wch:15}
    ];


    abaDivergencias["!cols"] = [
        {wch:15},
        {wch:18},
        {wch:18},
        {wch:15},
        {wch:12}
    ];

    abaEncontrados["!cols"] = [
    {wch:18},
    {wch:18},
    {wch:12}
];

    abaNaoEncontrados["!cols"] = [
        {wch:18},
        {wch:18}
    ];



    // Formatação de moeda

    for(let linha = 1; linha <= dados.divergencias.length; linha++){

        abaDivergencias[
            "B" + (linha+1)
        ].z = '"R$" #,##0.00';


        abaDivergencias[
            "C" + (linha+1)
        ].z = '"R$" #,##0.00';


        abaDivergencias[
            "D" + (linha+1)
        ].z = '"R$" #,##0.00';


        abaDivergencias[
            "E" + (linha+1)
        ].z = '0.00%';

    }



    // Moeda não encontrados

    for(let linha = 1; linha <= dados.naoEncontrados.length; linha++){

        if(
            abaNaoEncontrados["B"+(linha+1)]
        ){

            abaNaoEncontrados[
                "B"+(linha+1)
            ].z = '"R$" #,##0.00';

        }

    }



    // Filtros

    abaDivergencias["!autofilter"] = {
        ref:"A1:E" + (dados.divergencias.length+1)
    };


    abaNaoEncontrados["!autofilter"] = {
        ref:"A1:B" + (dados.naoEncontrados.length+1)
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