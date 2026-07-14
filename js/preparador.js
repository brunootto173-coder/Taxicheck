alert("Preparador carregado");

function prepararPlanilhas(){

    document.getElementById("resultado").innerHTML = `

    <div class="secao-titulo">

        <h2>Preparar Planilhas</h2>

        <p class="secao-desc">

            Organize automaticamente suas planilhas antes da comparação.

        </p>

    </div>

    <div class="upload-grid">

        <label class="upload-card">

            <span class="upload-label">

                Planilha de Dados

            </span>

            <input
                type="file"
                id="arquivoDados"
                accept=".xlsx,.xls">

        </label>

        <label class="upload-card">

            <span class="upload-label">

                Planilha de Conferência

            </span>

            <input
                type="file"
                id="arquivoConferenciaPreparar"
                accept=".xlsx,.xls">

        </label>

    </div>

    <button class="botao-primario" onclick="iniciarPreparacao()">
    Preparar Planilhas
</button>

    `;

}

function iniciarPreparacao(){

    let arquivoDados =
    document.getElementById("arquivoDados").files[0];

    let arquivoConferencia =
    document.getElementById("arquivoConferenciaPreparar").files[0];

    if(!arquivoDados || !arquivoConferencia){

        alert("Selecione as duas planilhas.");

        return;

    }

    lerPlanilhaPreparacao(arquivoDados, "dados");
    lerPlanilhaPreparacao(arquivoConferencia, "conferencia");

}

function lerPlanilhaPreparacao(arquivo, tipo){

    let leitor = new FileReader();

    leitor.onload = function(e){

        let dados = new Uint8Array(e.target.result);

        let workbook = XLSX.read(dados,{type:"array"});

        let nomeAba = workbook.SheetNames[0];

        let sheet = workbook.Sheets[nomeAba];

        let linhas = XLSX.utils.sheet_to_json(sheet,{
            header:1,
            defval:""
        });

        if(tipo=="dados"){

            window.planilhaDadosBruta = linhas;

        }else{

            window.planilhaConferenciaBruta = linhas;

        }

        verificarPreparacao();

    };

    leitor.readAsArrayBuffer(arquivo);

}

function verificarPreparacao(){

    if(
        window.planilhaDadosBruta &&
        window.planilhaConferenciaBruta
    ){

        document.getElementById("statusPreparacao").innerHTML=`

            <div class="status-info">

                <p>✅ Planilhas carregadas.</p>

                <button
                    class="botao-primario"
                    onclick="analisarPlanilhas()">

                    Analisar Planilhas

                </button>

            </div>

        `;

    }

}

function analisarPlanilhas(){

    let cabecalhoDados =
    localizarCabecalho(window.planilhaDadosBruta);

    let cabecalhoConferencia =
    localizarCabecalho(window.planilhaConferenciaBruta);

    document.getElementById("statusPreparacao").innerHTML = `

        <div class="status-info">

            <h3>Resultado da análise</h3>

            <p><b>Planilha de Dados:</b> Cabeçalho encontrado na linha ${cabecalhoDados + 1}</p>

            <p><b>Planilha de Conferência:</b> Cabeçalho encontrado na linha ${cabecalhoConferencia + 1}</p>

        </div>

    `;

}

function localizarCabecalho(linhas){

    const palavrasNumero = [
        "numero",
        "número",
        "chamado",
        "no.chamado",
        "nº",
        "id",
        "corrida"
    ];

    const palavrasValor = [
        "valor",
        "valor total",
        "preço",
        "total",
        "recebido"
    ];

    for(let i = 0; i < linhas.length; i++){

        let linha = linhas[i];

        let encontrouNumero = false;
        let encontrouValor = false;

        for(let coluna of linha){

            let texto = String(coluna)
                .toLowerCase()
                .trim();

            if(palavrasNumero.includes(texto)){
                encontrouNumero = true;
            }

            if(palavrasValor.includes(texto)){
                encontrouValor = true;
            }

        }

        if(encontrouNumero && encontrouValor){

            return i;

        }

    }

    return -1;

}