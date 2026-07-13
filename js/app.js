
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



// Mantém a tela certa conforme o estado do login
// (inclusive ao recarregar a página)

firebase.auth().onAuthStateChanged(function(usuario){

    if(usuario){

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




function comparar(){

    document.getElementById("resultado").innerHTML = `

    <h3>Comparação de Planilhas</h3>


    <label>
        Planilha Referência
    </label>

    <input 
        type="file" 
        id="arquivoReferencia"
        accept=".xlsx,.xls">


    <label>
        Planilha Conferência
    </label>

    <input 
        type="file" 
        id="arquivoConferencia"
        accept=".xlsx,.xls">


    <button onclick="iniciarComparacao()">
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

    <h3>Planilhas carregadas com sucesso!</h3>

    <button onclick="compararDados()">
        Executar Comparação
    </button>

    `;

}

}

function encontrarColunaNumero(cabecalho){

    for(let coluna of cabecalho){

        let nome = coluna
        .toString()
        .toLowerCase()
        .trim()
        .replace(".","")
        .replace(" ","");


        if(nome === "numero" || nome === "nochamado"){

            return coluna;

        }

    }


    return null;

}



function encontrarColunaValor(cabecalho){

    for(let coluna of cabecalho){

        let nome = coluna
        .toString()
        .toLowerCase()
        .trim()
        .replace(" ","");


        if(nome === "valor"){

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

const tolerancia = 0.25;


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


}




function mostrarResultado(total, encontrados, divergenciasValor, naoEncontrados){


    let html = `

    <h3>Resultado da Conferência</h3>


    <div class="resumo">

        <p>
        Total analisado:
        <b>${total}</b>
        </p>


        <p>
        Encontrados:
        <b>${encontrados.length}</b>
        </p>


        <p>
        Divergência de valor:
        <b>${divergenciasValor.length}</b>
        </p>


        <p>
        Não encontrados:
        <b>${naoEncontrados.length}</b>
        </p>


    </div>



    `;



    if(divergenciasValor.length > 0){


        html += `

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

        `;


    }



    html += `

<br>

<button onclick="exportarExcel()">
    Exportar Excel
</button>

`;

document.getElementById("resultadoComparacao")
.innerHTML = html;0


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