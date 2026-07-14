// =====================================================
// TaxiCheck 5.0
// Preparador Inteligente de Planilhas
// Parte 1
// =====================================================

const Preparador = {

    dados: null,
    conferencia: null,

    iniciar() {

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
                    id="arquivoDadosPreparador"
                    accept=".xlsx,.xls">

            </label>

            <label class="upload-card">

                <span class="upload-label">
                    Planilha de Conferência
                </span>

                <input
                    type="file"
                    id="arquivoConferenciaPreparador"
                    accept=".xlsx,.xls">

            </label>

        </div>

        <button
            class="botao-primario"
            onclick="Preparador.carregarArquivos()">

            Preparar Planilhas

        </button>

        <div
            id="statusPreparador"
            style="margin-top:30px;">
        </div>

        `;

    },

    carregarArquivos(){

        this.dados =
        document.getElementById("arquivoDadosPreparador").files[0];

        this.conferencia =
        document.getElementById("arquivoConferenciaPreparador").files[0];

        if(!this.dados || !this.conferencia){

            alert("Selecione as duas planilhas.");

            return;

        }

        this.status("Lendo planilhas...");

        Promise.all([

            this.lerExcel(this.dados),

            this.lerExcel(this.conferencia)

        ])

        .then(resultado=>{

            this.planilhaDados =
            resultado[0];

            this.planilhaConferencia =
            resultado[1];

            this.status("Planilhas carregadas.");

            this.processar();

        })

        .catch(erro=>{

            console.error(erro);

            this.status("Erro ao abrir as planilhas.");

        });

    },

    lerExcel(arquivo){

        return new Promise((resolve,reject)=>{

            const leitor =
            new FileReader();

            leitor.onload=(e)=>{

                try{

                    const workbook =
                    XLSX.read(
                        new Uint8Array(e.target.result),
                        {type:"array"}
                    );

                    const aba =
                    workbook.SheetNames[0];

                    const sheet =
                    workbook.Sheets[aba];

                    const linhas =
                    XLSX.utils.sheet_to_json(
                        sheet,
                        {
                            header:1,
                            defval:""
                        }
                    );

                    resolve(linhas);

                }

                catch(erro){

                    reject(erro);

                }

            };

            leitor.readAsArrayBuffer(arquivo);

        });

    },

    status(texto){

        document.getElementById("statusPreparador").innerHTML=`

            <div class="status-info">

                <p>${texto}</p>

            </div>

        `;

    },

    processar(){

    this.status("Localizando cabeçalhos...");

    const cabDados =
        this.localizarCabecalho(this.planilhaDados);

    const cabConf =
        this.localizarCabecalho(this.planilhaConferencia);

    if(cabDados === -1 || cabConf === -1){

        this.status("Não foi possível localizar o cabeçalho das planilhas.");

        return;

    }

    this.planilhaDados =
        this.planilhaDados.slice(cabDados);

    this.planilhaConferencia =
        this.planilhaConferencia.slice(cabConf);

    this.planilhaDados =
        this.removerLinhasVazias(this.planilhaDados);

    this.planilhaConferencia =
        this.removerLinhasVazias(this.planilhaConferencia);

    this.planilhaDados =
        this.removerTextos(this.planilhaDados);

    this.planilhaConferencia =
        this.removerTextos(this.planilhaConferencia);

    this.status(

        "Limpeza inicial concluída.<br><br>" +

        "Dados: " + this.planilhaDados.length + " linhas<br>" +

        "Conferência: " + this.planilhaConferencia.length + " linhas"

    );

}


// Esta função será chamada pelo menu lateral

function prepararPlanilhas(){

    Preparador.iniciar();

}

// =======================================
// PARTE 2 - Limpeza Inicial
// =======================================

Preparador.localizarCabecalho = function(linhas){

    const numero = [
        "numero",
        "número",
        "chamado",
        "no.chamado",
        "id",
        "corrida",
        "nº"
    ];

    const valor = [
        "valor",
        "valor total",
        "preço",
        "total",
        "recebido"
    ];

    for(let i = 0; i < linhas.length; i++){

        let encontrouNumero = false;
        let encontrouValor = false;

        for(let celula of linhas[i]){

            let texto = String(celula)
                .toLowerCase()
                .trim();

            if(numero.includes(texto))
                encontrouNumero = true;

            if(valor.includes(texto))
                encontrouValor = true;

        }

        if(encontrouNumero && encontrouValor){

            return i;

        }

    }

    return -1;

};


Preparador.removerLinhasVazias = function(linhas){

    return linhas.filter(function(linha){

        return linha.some(function(celula){

            return String(celula).trim() !== "";

        });

    });

};


Preparador.removerTextos = function(linhas){

    const ignorar = [

        "relatório",
        "relatorio",
        "empresa",
        "gerado",
        "observação",
        "observacoes",
        "observações",
        "página",
        "pagina",
        "subtotal",
        "total geral",
        "fim"

    ];

    return linhas.filter(function(linha){

        let texto = linha.join(" ").toLowerCase();

        for(let palavra of ignorar){

            if(texto.includes(palavra))
                return false;

        }

        return true;

    });

};