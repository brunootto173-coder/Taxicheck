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

        this.status("Iniciando preparação...");

        console.log("Dados:",this.planilhaDados);

        console.log("Conferência:",this.planilhaConferencia);

    }

};


// Esta função será chamada pelo menu lateral

function prepararPlanilhas(){

    Preparador.iniciar();

}