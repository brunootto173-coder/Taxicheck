function prepararPlanilhas(){

    document.getElementById("resultado").innerHTML = `

        <div class="secao-titulo">

            <h2>Preparar Planilhas</h2>

            <p class="secao-desc">

                Organize automaticamente suas planilhas.

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
                    id="arquivoConferencia"
                    accept=".xlsx,.xls">

            </label>

        </div>

        <button
            class="botao-primario"
            onclick="iniciarPreparacao()">

            Preparar Planilhas

        </button>

        <div id="statusPreparacao"></div>

    `;

}

function iniciarPreparacao(){

    let arquivoDados =
    document.getElementById("arquivoDados").files[0];

    let arquivoConferencia =
    document.getElementById("arquivoConferencia").files[0];

    if(!arquivoDados || !arquivoConferencia){

        alert("Selecione as duas planilhas.");

        return;

    }

    lerPlanilha(arquivoDados,"dados");

    lerPlanilha(arquivoConferencia,"conferencia");

}

function lerPlanilha(arquivo,tipo){

    let leitor = new FileReader();

    leitor.onload = function(e){

        let dados =
        new Uint8Array(e.target.result);

        let workbook =
        XLSX.read(dados,{type:"array"});

        let nomeAba =
        workbook.SheetNames[0];

        let sheet =
        workbook.Sheets[nomeAba];

        let linhas =
        XLSX.utils.sheet_to_json(sheet,{
            header:1,
            defval:""
        });

        if(tipo=="dados"){

            window.planilhaDados = linhas;

        }else{

            window.planilhaConferencia = linhas;

        }

        verificarArquivos();

    };

    leitor.readAsArrayBuffer(arquivo);

}

function verificarArquivos(){

    if(
        window.planilhaDados &&
        window.planilhaConferencia
    ){

        document.getElementById("statusPreparacao").innerHTML = `

            <div class="status-info">

                <p>✅ As duas planilhas foram carregadas.</p>

            </div>

        `;

        console.log(window.planilhaDados);

        console.log(window.planilhaConferencia);

    }

}