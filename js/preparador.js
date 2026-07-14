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

    document.getElementById("statusPreparacao").innerHTML = `

        <div class="status-info">

            <p>Funcionando corretamente ✅</p>

        </div>

    `;

}