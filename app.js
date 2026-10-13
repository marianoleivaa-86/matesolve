let respuestaCorrecta = null;
let rachaAciertos = 0;
let inputActivoId = null;
// Variables globales para las instancias de Chart.js de cada módulo.
// Se destruyen antes de crear una nueva para evitar superposiciones.
let chartInterpolacion = null;
let chartMaxMin        = null;
let chartIntegral      = null;

// =============================================================================
// UTILIDADES GENERALES
// =============================================================================

// Agrega un evento global que detecta cuando un elemento recibe el foco
document.addEventListener("focusin", (e) => {
    // Si el elemento enfocado es un input de tipo texto
    if (e.target.tagName === "INPUT" && e.target.type === "text") {
        // Guarda el ID del input activo para saber dónde insertar los símbolos
        inputActivoId = e.target.id;
        // Abre automáticamente el panel del teclado matemático
      //  abrirTeclado();
    }
});

// Inserta un símbolo matemático o ejecuta un borrado en el input actualmente activo
function insertarSimbolo(event, simbolo) {
    // Evita que el input pierda el foco al hacer clic (previene el comportamiento por defecto)
    if (event) event.preventDefault();
    
    // Si no hay ningún input activo, cancela la ejecución
    if (!inputActivoId) return;
    
    // Obtiene el elemento input exacto usando el ID que guardamos
    const input = document.getElementById(inputActivoId);
    // Posición inicial donde está el cursor o donde empieza la selección
    const start = input.selectionStart;
    // Posición final donde está el cursor o donde termina la selección
    const end = input.selectionEnd;
    
    // Si el usuario tocó el botón de borrar (⌫)
    if (simbolo === 'BACKSPACE') {
        // Verifica si hay una porción de texto sombreada (seleccionada)
        if (start !== end) {
            // Une la parte antes de la selección con la parte después, borrando el medio
            input.value = input.value.substring(0, start) + input.value.substring(end);
            // Coloca el cursor al inicio del área que acabamos de borrar
            input.setSelectionRange(start, start);
        } 
        // Si no hay texto seleccionado pero el cursor no está en el extremo izquierdo
        else if (start > 0) {
            // Une la parte anterior menos el último carácter con la parte posterior
            input.value = input.value.substring(0, start - 1) + input.value.substring(end);
            // Mueve el cursor un lugar hacia atrás, porque borramos 1 carácter
            input.setSelectionRange(start - 1, start - 1);
        }
    } 
    // Para cualquier otro botón (números, operadores, funciones)
    else {
        // Intercala el texto del símbolo en la posición exacta del cursor
        input.value = input.value.substring(0, start) + simbolo + input.value.substring(end);
        // Avanza el cursor para que quede inmediatamente después de lo insertado
        input.setSelectionRange(start + simbolo.length, start + simbolo.length);
    }
    // Nos aseguramos forzosamente de que el campo de texto siga activo
    input.focus();
}

// Muestra el teclado deslizando el panel hacia arriba
function abrirTeclado() {
    // Busca el div del panel del teclado
    const panel = document.getElementById('panel-teclado');
    if (panel) {
        // Le quita la clase que lo esconde fuera de pantalla
        panel.classList.remove('teclado-oculto');
        // Agrega espacio al final de la página para que no tapen botones debajo
        document.body.style.paddingBottom = "300px";
        // ETAPA 2B: También aplicamos el padding al pizarrón (donde está el scroll interno principal)
        const pizarron = document.querySelector('.pizarron');
        if (pizarron) pizarron.style.paddingBottom = "300px";
    }
}

// Oculta el teclado deslizando el panel hacia abajo
function cerrarTeclado(event) {
    // Previene pérdida de foco accidental al tocar la cruz de cerrar
    if (event) event.preventDefault();
    
    const panel = document.getElementById('panel-teclado');
    if (panel) {
        // Le agrega la clase que lo esconde
        panel.classList.add('teclado-oculto');
        // Quita el espacio extra que habíamos agregado en el fondo
        document.body.style.paddingBottom = "0";
        // ETAPA 2B: Quita el espacio extra del pizarrón
        const pizarron = document.querySelector('.pizarron');
        if (pizarron) pizarron.style.paddingBottom = "0";
    }
}

// Gestiona el cambio entre las diferentes pestañas de símbolos (Básico, Funciones, Cálculo)
function cambiarPestanaTeclado(event, pestanaId) {
    // Evita que el click quite el foco del input que estás editando
    if (event) event.preventDefault();
    
    // Obtiene todos los bloques que contienen botones (grillas)
    const grids = document.querySelectorAll('.teclado-grid');
    // Las oculta todas quitando la clase 'activa'
    grids.forEach(g => g.classList.remove('activa'));
    
    // Obtiene todos los botones de las pestañas
    const tabs = document.querySelectorAll('.tab-btn');
    // Les quita el estilo de "seleccionado"
    tabs.forEach(t => t.classList.remove('tab-activa'));
    
    // Muestra solo la grilla que corresponde al ID enviado
    const grillaSeleccionada = document.getElementById(pestanaId);
    if (grillaSeleccionada) grillaSeleccionada.classList.add('activa');
    
    // Pinta la pestaña que el usuario acaba de tocar (event.target)
    if (event && event.target) {
        event.target.classList.add('tab-activa');
    }
}

function guardarEnHistorial(op, res) {
    let hist = JSON.parse(localStorage.getItem("matesolve_historial")) || [];
    hist.unshift({ operacion: op, resultado: res, fecha: new Date().toLocaleTimeString() });
    if (hist.length > 5) hist.pop();
    localStorage.setItem("matesolve_historial", JSON.stringify(hist));
    actualizarVistaHistorial();
}

function actualizarVistaHistorial() {
    const lista = document.getElementById("lista-historial");
    if (!lista) return;
    let hist = JSON.parse(localStorage.getItem("matesolve_historial")) || [];
    lista.innerHTML = hist.length === 0 ? `<li style="border-left:none; color:#94a3b8;">Sin cálculos recientes.</li>` : 
        hist.map(h => `<li><strong>${h.operacion}</strong> → ${h.resultado} <small style="float:right; color:#94a3b8;">${h.fecha}</small></li>`).join("");
}

function borrarHistorial() { localStorage.removeItem("matesolve_historial"); actualizarVistaHistorial(); }
document.addEventListener("DOMContentLoaded", actualizarVistaHistorial);

function obtenerRangoNivel(r) {
    if (r >= 15) return "🏆 Máster en Análisis";
    if (r >= 10) return "🥇 Analista Avanzado";
    if (r >= 5)  return "🥈 Estudiante Experto";
    return "🥉 Principiante";
}

function mostrarAdvertencia(sol, msg = "⚠️ Completá todos los campos.") {
    if (sol) sol.innerHTML = `<p style="color:red;">${msg}</p>`;
}

function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }

// =============================================================================
// EL MOTOR DE ÑIOO (SISTEMA DE TUTORÍA)
// =============================================================================

async function niooDice(mensajes, contenedorId) {
    const container = document.getElementById(contenedorId);
    container.innerHTML = `<div class="chat-container" id="chat-flow">
        <div class="typing-indicator" id="typing">Ñioo está pensando... ✍️</div>
    </div>`;
    const flow = document.getElementById('chat-flow');
    const typing = document.getElementById('typing');

    for (let msg of mensajes) {
        await new Promise(res => setTimeout(res, 800));
        const row = document.createElement('div');
        row.className = 'message-row';
        const isFormula = msg.startsWith('FORMULA:');
        const texto = isFormula ? msg.replace('FORMULA:', '') : msg;
        row.innerHTML = `<div class="avatar-nioo">👨‍🏫</div><div class="${isFormula ? 'bubble formula-bubble' : 'bubble'}">${texto}</div>`;
        flow.appendChild(row);
        row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    typing.style.display = 'none';
}

// =============================================================================
// NAVEGACIÓN DEL MENÚ
// =============================================================================

function seleccionar(opcion) {
    const resDiv = document.getElementById("resultado");
    resDiv.innerHTML = "";

    // === ETAPA 2: ACTUALIZAR TARJETA ACTIVA ===
    // Obtiene todas las tarjetas del menú mediante su clase
    const tarjetas = document.querySelectorAll('.card-modulo');
    // Le quita la clase de activo a todas para reiniciar visualmente el menú
    tarjetas.forEach(t => t.classList.remove('card-activa'));
    // Busca específicamente la tarjeta que corresponde al módulo que acabás de abrir
    const tarjetaSeleccionada = document.querySelector(`.card-modulo[data-opcion="${opcion}"]`);
    // Si la encuentra, le añade la clase para que quede marcada con borde azul
    if (tarjetaSeleccionada) tarjetaSeleccionada.classList.add('card-activa');
    // ==========================================

    if (opcion === "sistema") {
        resDiv.innerHTML = `<h3>🧮 Sistema de ecuaciones 2×2</h3>
            <label class="label-campo">Primera ecuación</label><input type="text" id="eq1" placeholder="Ej: 2x + y = 7">
            <label class="label-campo">Segunda ecuación</label><input type="text" id="eq2" placeholder="Ej: x - y = 2">
            <button onclick="resolverSistema()">Resolver</button><div id="solSistema"></div>`;
    } else if (opcion === "raices") {
        resDiv.innerHTML = `<h3>📈 Aproximación de Raíces</h3>
            <label class="label-campo">Función f(x)</label><input type="text" id="fRaiz" value="x^2 - 2">
            <label class="label-campo">Método</label>
            <select id="mRaiz" onchange="toggleRaizInputs()">
                <option value="biseccion">Bisección</option>
                <option value="reglaFalsa">Regla Falsa</option>
                <option value="newton">Newton-Raphson</option>
            </select>
            <div id="divInt"><label class="label-campo">Intervalo [a, b]</label>
                <div style="display:flex; gap:10px;"><input type="number" id="rA" placeholder="a" step="any"><input type="number" id="rB" placeholder="b" step="any"></div>
            </div>
            <div id="divNew" style="display:none;"><label class="label-campo">Valor Inicial x₀</label><input type="number" id="rX0" placeholder="x0" step="any"></div>
            <label class="label-campo">Tolerancia</label><input type="number" id="rTol" value="0.01" step="any">
            <button onclick="resolverRaices()">Calcular Raíz</button><div id="solRaiz"></div>`;
    } else if (opcion === "interpolacion") {
        resDiv.innerHTML = `<h3>📍 Interpolación a Incrementos Constantes</h3>
            <div id="tabInterp" style="margin-bottom:10px;">
                <div class="fila-interp" style="display:flex; gap:5px; margin-bottom:5px;"><input type="number" class="ix" placeholder="X0" step="any"><input type="number" class="iy" placeholder="Y0" step="any"></div>
                <div class="fila-interp" style="display:flex; gap:5px; margin-bottom:5px;"><input type="number" class="ix" placeholder="X1" step="any"><input type="number" class="iy" placeholder="Y1" step="any"></div>
                <div class="fila-interp" style="display:flex; gap:5px; margin-bottom:5px;"><input type="number" class="ix" placeholder="X2" step="any"><input type="number" class="iy" placeholder="Y2" step="any"></div>
            </div>
            <button onclick="addInterpRow()" style="background:#64748b; font-size:12px; margin-bottom:10px;">➕ Agregar Punto</button>
            <label class="label-campo">Valor de X a evaluar</label><input type="number" id="iXObj" placeholder="Ej: 1.5" step="any">
            <button onclick="resolverInterp()">Calcular Yₖ</button><div id="solInterp"></div>`;
    } else if (opcion === "limites") {
        resDiv.innerHTML = `<h3>🎯 Cálculo de Límites</h3>
            <label class="label-campo">Función f(x)</label><input type="text" id="fLim" placeholder="Ej: (x^2-1)/(x-1)">
            <label class="label-campo">Valor x → a</label><input type="number" id="pA" placeholder="a">
            <button onclick="calcLim()">Calcular</button><div id="solLim"></div>`;
    } else if (opcion === "derivadas") {
        resDiv.innerHTML = `<h3>📉 Derivadas</h3>
            <label class="label-campo">Función f(x)</label><input type="text" id="fDer" placeholder="Ej: x^3 + 2x">
            <button onclick="calcDer()">Derivar</button><div id="solDer"></div>`;
    } else if (opcion === "maximos-minimos") {
        resDiv.innerHTML = `<h3>📌 Análisis de Puntos</h3>
            <label class="label-campo">Función f(x)</label><input type="text" id="fMax" placeholder="Ej: x^3 - 3x">
            <button onclick="calcMaxMin()">Analizar</button><div id="solMax"></div>`;
    } else if (opcion === "integrales") {
        resDiv.innerHTML = `<h3>∫ Integral Definida</h3>
            <label class="label-campo">Función f(x)</label><input type="text" id="fInt" placeholder="Ej: x^2">
            <div style="display:flex; gap:10px;"><input type="number" id="lA" placeholder="a"><input type="number" id="lB" placeholder="b"></div>
            <button onclick="calcInt()">Calcular Área</button><div id="solInt"></div>`;
    } else if (opcion === "integral-indefinida") {
        resDiv.innerHTML = `<h3>∫ Integral Indefinida</h3>
            <label class="label-campo">Función f(x)</label><input type="text" id="fIndef" placeholder="Ej: 3*x^2">
            <button onclick="calcIndef()">Resolver</button><div id="solIndef"></div>`;
    } else if (opcion === "matrices") {
        resDiv.innerHTML = `<h3>🔢 Determinante 2x2</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; max-width: 200px; margin: 10px auto;">
                <input type="number" id="m00" placeholder="a11"><input type="number" id="m01" placeholder="a12">
                <input type="number" id="m10" placeholder="a21"><input type="number" id="m11" placeholder="a22">
            </div>
            <button onclick="calcMat()">Calcular Det</button><div id="solMat"></div>`;
    } else if (opcion === "graficador") {
        resDiv.innerHTML = `<h3>🎨 Graficador</h3><input type="text" id="fGraf" placeholder="Ej: sin(x)*x">
            <button onclick="graficar()">Graficar</button><div id="solGraf"></div>`;
    } else if (opcion === "practica") {
        resDiv.innerHTML = `
            <h3>🎯 Centro de Entrenamiento de Ñioo</h3>
            <div style="background:#e0f2fe; padding:15px; border-radius:15px; margin-bottom:20px; border-left:5px solid #2563eb;">
                <p style="margin:0;">🔥 Racha actual: <strong id="racha-count">${rachaAciertos}</strong> aciertos</p>
                <p style="margin:0; font-size:13px; color:#475569;">Nivel: <strong id="nivel-badge">${obtenerRangoNivel(rachaAciertos)}</strong></p>
            </div>
            <label class="label-campo">¿Qué quieres practicar hoy?</label>
            <select id="tPrac" onchange="nuevoEjerc()" style="margin-bottom:20px;">
                <option value="sistema">🧮 Sistemas de ecuaciones 2x2</option>
                <option value="interpolacion">📍 Interpolación de Newton</option>
                <option value="raices">📈 Aproximación de Raíces</option>
                <option value="limites">🎯 Cálculo de Límites</option>
                <option value="derivadas">📉 Derivadas Básicas</option>
                <option value="integrales">∫ Integrales Definidas</option>
                <option value="matrices">🔢 Determinantes 2x2</option>
            </select>
            <div id="ejPrac" style="font-size:1.2em; margin-bottom:20px; background:white; padding:20px; border-radius:15px; border:1px solid #e2e8f0;"></div>
            <label class="label-campo">Tu respuesta</label>
            <input type="text" id="resPrac" placeholder="Escribe el resultado numérico">
            <div style="display:flex; gap:10px; justify-content:center;">
                <button onclick="checkRes()">✅ Comprobar</button>
                <button onclick="nuevoEjerc()" style="background:#64748b;">🔄 Cambiar Ejercicio</button>
            </div>
            <div id="resPracDiv" style="margin-top:15px;"></div>`;
        nuevoEjerc();
    }
    // resDiv.scrollIntoView({ behavior: "smooth", block: "start" }); // Comentado en la Etapa 2B porque el pizarrón maneja su propio scroll
}

// =============================================================================
// MÓDULOS MATEMÁTICOS CON EXPLICACIONES DE ÑIOO
// =============================================================================

// Agrega una nueva fila de inputs para ingresar otro punto (x, y) en la tabla de interpolación
function addInterpRow() {
    // Obtiene el contenedor de la tabla de puntos por su ID
    const c = document.getElementById('tabInterp');
    // Obtiene la cantidad de puntos actuales para asignarle el índice correcto al nuevo
    const i = c.children.length;
    // Inserta una nueva fila sin sobrescribir los valores ya ingresados por el usuario
    c.insertAdjacentHTML('beforeend', `<div class="fila-interp" style="display:flex; gap:5px; margin-bottom:5px;"><input type="number" class="ix" placeholder="X${i}" step="any"><input type="number" class="iy" placeholder="Y${i}" step="any"></div>`);
}

// Calcula el número combinatorio generalizado C(s, k) = s(s-1)...(s-k+1) / k!
function numeroCombinatorio(s, k) {
    // Si k es 0, por convención el resultado es 1
    if (k === 0) return 1;
    // Inicializa el numerador en 1 para acumular los productos
    let num = 1;
    // Multiplica k términos: s * (s-1) * ... * (s-k+1)
    for (let m = 0; m < k; m++) num *= (s - m);
    // Retorna el producto dividido por el factorial de k (usando la función ya existente)
    return num / factorial(k);
}

// Función principal asíncrona que resuelve la interpolación de Newton hacia adelante
async function resolverInterp() {
    // Obtiene todos los valores ingresados de X y los convierte a números
    const xV = Array.from(document.querySelectorAll('.ix')).map(i => parseFloat(i.value));
    // Obtiene todos los valores ingresados de Y y los convierte a números
    const yV = Array.from(document.querySelectorAll('.iy')).map(i => parseFloat(i.value));
    // Obtiene el valor objetivo de X a evaluar en el polinomio
    const xO = parseFloat(document.getElementById('iXObj').value);
    // Obtiene el contenedor de la solución donde Ñioo hablará
    const sol = document.getElementById('solInterp');
    // Si algún dato es inválido o falta, muestra una advertencia y detiene el proceso
    if (xV.some(isNaN) || yV.some(isNaN) || isNaN(xO)) return mostrarAdvertencia(sol);

    // Calcula el incremento 'h' restando el primer X al segundo X
    const h = xV[1] - xV[0];
    // Verifica que todos los saltos de X sean iguales (incremento constante)
    for (let i = 1; i < xV.length - 1; i++) {
        // Si hay una diferencia apreciable en el incremento, muestra un error y detiene
        if (Math.abs((xV[i+1] - xV[i]) - h) > 0.0001) return sol.innerHTML = `<p style="color:red;">⚠️ Error: Los incrementos de X deben ser constantes.</p>`;
    }

    // 'n' es la cantidad de puntos; 'diff' será la matriz para diferencias; 'calDelta' guarda el diálogo de restas
    let n = yV.length, diff = Array.from({ length: n }, () => Array(n).fill(0)), calDelta = []; 
    // Llena la primera columna de la matriz con los valores iniciales de Y
    for (let i = 0; i < n; i++) diff[i][0] = yV[i];
    // Calcula las columnas siguientes de diferencias finitas (órdenes 1 a n-1)
    for (let j = 1; j < n; j++) {
        // Inicializa el texto de explicación para el orden 'j'
        let txt = `Diferencias de orden ${j}:<br>`;
        // Determina el símbolo de exponente para Δ (vacío para 1, ² para 2, ³ para 3, etc.)
        let sup_j = j === 1 ? '' : j === 2 ? '²' : j === 3 ? '³' : `^${j}`;
        // Calcula cada celda restando el valor superior al inferior de la columna anterior
        for (let i = 0; i < n - j; i++) {
            // Almacena la resta en la matriz
            diff[i][j] = diff[i + 1][j - 1] - diff[i][j - 1];
            // Construye los subíndices usando caracteres unicode para mejor visualización
            let sub_i = i.toString().split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join('');
            let sub_i1 = (i+1).toString().split('').map(c => '₀₁₂₃₄₅₆₇₈₉'[c]).join('');
            // Añade el paso matemático de esta resta específica al texto
            txt += `Δ${sup_j}y${sub_i} = y${sub_i1} - y${sub_i} = ${diff[i+1][j-1].toFixed(2)} - ${diff[i][j-1].toFixed(2)} = <strong style="color:#2563eb;">${diff[i][j].toFixed(2)}</strong><br>`;
        }
        // Guarda la explicación de este orden en el arreglo de diálogos
        calDelta.push(txt);
    }

    // Calcula la variable parametrizada 's'
    const s = (xO - xV[0]) / h;
    
    // Construye la cabecera dinámica de la tabla de diferencias según la cantidad de puntos
    let thCols = `<th>X</th><th>Y</th>`;
    // Añade una columna de cabecera por cada orden de diferencia calculado
    for(let j = 1; j < n; j++) {
        let sup_j = j === 1 ? '' : j === 2 ? '²' : j === 3 ? '³' : `^${j}`;
        thCols += `<th>Δ${sup_j}Y</th>`;
    }

    // Inicializa el diálogo que mostrará Ñioo paso por paso
    let diag = [
        // Saludo inicial
        `¡Hola! Soy <strong>Ñioo</strong>. Vamos a interpolar esto paso a paso. 🎓`,
        // a) Muestra los datos iniciales y el valor del incremento h
        `<strong>1. Datos:</strong><br>Puntos: ${xV.map((x, i) => `(${x}, ${yV[i]})`).join(", ")}.<br>Incremento h = ${h}. Valor a evaluar x = ${xO}.`,
        // b) Muestra cómo se calcula 's'
        `<strong>2. Cálculo de s:</strong><br>Calculamos la variable parametrizada <strong style="color:#2563eb;">s</strong>:<br>FORMULA: s = (x - x₀) / h = (${xO} - ${xV[0]}) / ${h} = <strong style="font-size:1.2em;">${s.toFixed(4)}</strong>`,
        // Inicio de la explicación de las diferencias finitas
        `<strong>3. Diferencias Finitas:</strong><br>Restamos cada término de su sucesor:`
    ];
    // c) Agrega las explicaciones de cada resta que precalculamos en 'calDelta'
    diag = diag.concat(calDelta);
    
    // Comienza a armar la tabla HTML con todas las diferencias finitas
    let tabla = `FORMULA: <table border="1" style="width:100%; text-align:center; border-collapse:collapse; background:white; color:black; font-size:12px;"><tr style="background:#eee;">${thCols}</tr>`;
    // Recorre cada fila para rellenar la tabla
    for (let i = 0; i < n; i++) {
        // Primera columna: valor de X
        tabla += `<tr><td>${xV[i]}</td>`;
        // Columnas siguientes: valores de Y y sus diferencias finitas calculadas
        for (let j = 0; j < n; j++) {
            // Muestra el valor si pertenece al triángulo de diferencias válidas, sino un guión
            tabla += `<td>${i < n - j ? diff[i][j].toFixed(2) : '-'}</td>`;
        }
        // Cierra la fila actual
        tabla += `</tr>`;
    }
    // Cierra la estructura de la tabla y la agrega al diálogo
    tabla += `</table>`;
    diag.push(tabla);

    // Obtiene el exponente máximo para mostrar en la fórmula adaptada
    let maxSup = n - 1 === 1 ? '' : n - 1 === 2 ? '²' : n - 1 === 3 ? '³' : `^${n-1}`;
    // d) Muestra la fórmula general infinita y la fórmula desarrollada para este caso
    diag.push(
        `<strong>4. Fórmula de Newton:</strong><br>Forma general (infinita):<br>FORMULA: P(x) = y₀ + Σ(k=1→∞) C(s,k)Δᵏy₀`,
        `En la práctica, la suma se corta en las diferencias que existen en la tabla (con ${n} puntos hay hasta Δ${maxSup}y₀).<br>Fórmula desarrollada:<br>FORMULA: P(x) = y₀ + C(s,1)Δy₀ + C(s,2)Δ²y₀ + ... + C(s,${n-1})Δ${maxSup}y₀`
    );

    // Inicia la acumulación del resultado final empezando por y0
    let resY = diff[0][0];
    // Inicia el texto que mostrará la suma final paso a paso
    let suma = `${parseFloat(diff[0][0].toFixed(4))}`;
    
    // Recorre cada orden de diferencia desde k=1 hasta n-1
    for (let k = 1; k < n; k++) {
        // Formatea el valor de s para mostrarlo sin excesivos decimales
        let sStr = parseFloat(s.toFixed(4));
        // Construye el texto para mostrar los factores multiplicados en el numerador de C(s,k)
        let numStr = "";
        for (let m = 0; m < k; m++) {
            if (m === 0) numStr += `(${sStr})`;
            else numStr += `(${sStr} - ${m})`;
        }
        
        // e) Calcula C(s,k) y arma el diálogo mostrando numerador y denominador
        let c_sk = numeroCombinatorio(s, k);
        diag.push(`Cálculo de C(s,${k}):<br>[ ${numStr} ] / ${k}! = <strong style="color:#2563eb;">${parseFloat(c_sk.toFixed(4))}</strong>`);
        
        // f) Calcula el término multiplicando C(s,k) por la diferencia finita correspondiente
        let term = c_sk * diff[0][k];
        let sup_k = k === 1 ? '' : k === 2 ? '²' : k === 3 ? '³' : `^${k}`;
        diag.push(`Término ${k} ( C(s,${k}) · Δ${sup_k}y₀ ):<br>${parseFloat(c_sk.toFixed(4))} * ${parseFloat(diff[0][k].toFixed(4))} = <strong style="color:#2563eb;">${parseFloat(term.toFixed(4))}</strong>`);
        
        // Suma el valor de este término al resultado total
        resY += term;
        // Añade este término a la cadena de texto de la suma final
        suma += ` ${term >= 0 ? '+' : '-'} ${Math.abs(parseFloat(term.toFixed(4)))}`;
    }
    
    // g) Muestra el cálculo de la suma final y el resultado
    diag.push(
        `<strong>5. Cálculo Final:</strong><br>Sumamos todos los términos evaluados:`, 
        `FORMULA: P(${xO}) = ${suma} = <strong style="font-size:1.5em; color:#2563eb;">${resY.toFixed(4)}</strong>`, 
        `¡Listo! 🚀`
    );
    
    // Envía todo el diálogo acumulado a la interfaz para que Ñioo lo muestre animado.
    // Esperamos a que termine para luego insertar el gráfico y los botones debajo.
    await niooDice(diag, 'solInterp');

    // Guarda este cálculo en el historial de operaciones para futuras referencias
    guardarEnHistorial(`Interp Newton x=${xO}`, `Y ≈ ${resY.toFixed(4)}`);

    // ─── GRÁFICA INTERACTIVA ──────────────────────────────────────────────────
    // Insertamos el contenedor del canvas debajo del chat de Ñioo
    const solInterp = document.getElementById('solInterp');

    // Contenedor del gráfico con clase para estilos CSS
    const contenedorGrafico = document.createElement('div');
    contenedorGrafico.className = 'contenedor-grafico';
    contenedorGrafico.innerHTML = `
        <h4 style="margin:0 0 10px; color:#2563eb; font-family:'Poppins',sans-serif;">📈 Gráfica del polinomio interpolante</h4>
        <canvas id="graficoInterpolacion"></canvas>
    `;
    solInterp.appendChild(contenedorGrafico);

    // Dibujamos la gráfica usando los puntos y el polinomio calculado
    dibujarGraficoInterpolacion(xV, yV, (x) => {
        // Evalúa el polinomio de Newton en cualquier x usando los mismos datos
        let yk = diff[0][0];
        const sv = (x - xV[0]) / h;
        for (let k = 1; k < n; k++) {
            yk += numeroCombinatorio(sv, k) * diff[0][k];
        }
        return yk;
    });

    // ─── BOTONERA DE EXPORTACIÓN ─────────────────────────────────────────────
    // Genera el texto plano de la solución para copiarlo al portapapeles
    const textoSolucion = [
        `=== Interpolación de Newton - MateSolve ===`,
        `Puntos: ${xV.map((x, i) => `(${x}, ${yV[i]})`).join(', ')}`,
        `h = ${h} | x a evaluar = ${xO} | s = ${((xO - xV[0]) / h).toFixed(4)}`,
        `Resultado: P(${xO}) ≈ ${resY.toFixed(4)}`
    ].join('\n');

    // Renderizamos la barra de herramientas con los dos botones
    const barraExport = document.createElement('div');
    barraExport.className = 'barra-exportacion';
    barraExport.innerHTML = `
        <button class="btn-exportar" onclick="copiarSolucion(this, \`${textoSolucion.replace(/`/g, "'")}\`)">📋 Copiar Solución</button>
        <button class="btn-exportar" onclick="imprimirPizarron()">📥 Imprimir Pizarrón</button>
    `;
    solInterp.appendChild(barraExport);
}

// =============================================================================
// GRÁFICA INTERACTIVA DE INTERPOLACIÓN (Chart.js)
// =============================================================================

/**
 * Dibuja la curva del polinomio interpolante y los puntos dados.
 * @param {number[]} puntosX  - Arreglo de coordenadas X de los datos
 * @param {number[]} puntosY  - Arreglo de coordenadas Y de los datos
 * @param {Function} funcionPolinomio - Función que evalúa el polinomio en un x dado
 */
function dibujarGraficoInterpolacion(puntosX, puntosY, funcionPolinomio) {
    // Si ya existe un gráfico previo, lo destruimos para evitar superposiciones
    if (chartInterpolacion) {
        chartInterpolacion.destroy();
        chartInterpolacion = null;
    }

    const canvas = document.getElementById('graficoInterpolacion');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Calculamos el rango X con un margen (buffer) a cada lado para ver la curva completa
    const minX = Math.min(...puntosX);
    const maxX = Math.max(...puntosX);
    const buffer = (maxX - minX) * 0.2 || 1; // mínimo 1 si todos los X son iguales
    const xInicio = minX - buffer;
    const xFin    = maxX + buffer;

    // Generamos 200 puntos equidistantes para obtener una curva suave
    const pasos = 200;
    const curvaX = [], curvaY = [];
    for (let i = 0; i <= pasos; i++) {
        const xi = xInicio + (xFin - xInicio) * (i / pasos);
        curvaX.push(parseFloat(xi.toFixed(4)));
        curvaY.push(parseFloat(funcionPolinomio(xi).toFixed(4)));
    }

    // Preparamos los puntos originales como objetos {x, y} para el dataset scatter
    const puntosDataset = puntosX.map((x, i) => ({ x, y: puntosY[i] }));

    // Instanciamos el gráfico con Chart.js
    chartInterpolacion = new Chart(ctx, {
        data: {
            // El dataset de la curva usa los labels del eje X
            labels: curvaX,
            datasets: [
                {
                    // Curva continua del polinomio
                    type: 'line',
                    label: 'Polinomio P(x)',
                    data: curvaY,
                    borderColor: '#2563eb',
                    borderWidth: 2.5,
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    fill: true,
                    tension: 0.4,       // curva suavizada (cubic spline)
                    pointRadius: 0,     // sin puntos en la curva para que se vea limpia
                    order: 2            // se dibuja primero (detrás de los puntos)
                },
                {
                    // Puntos dados por el usuario destacados con marcas grandes
                    type: 'scatter',
                    label: 'Puntos dados',
                    data: puntosDataset,
                    backgroundColor: '#6366f1',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    pointRadius: 7,
                    pointHoverRadius: 9,
                    order: 1            // se dibuja encima de la curva
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { font: { family: 'Inter, sans-serif', size: 12 } }
                },
                tooltip: {
                    // Muestra coordenadas (x, y) con 4 decimales en el tooltip
                    callbacks: {
                        title: (items) => `x = ${parseFloat(items[0].label).toFixed(4)}`,
                        label: (item) => `y = ${parseFloat(item.parsed.y).toFixed(4)}`
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'x', font: { size: 13 } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                y: {
                    title: { display: true, text: 'P(x)', font: { size: 13 } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

// =============================================================================
// HERRAMIENTAS DE EXPORTACIÓN
// =============================================================================

/**
 * Copia el texto de la solución al portapapeles.
 * Cambia el texto del botón brevemente para dar feedback visual.
 * @param {HTMLElement} btn  - El botón que fue clickeado
 * @param {string} texto     - Texto plano de la solución a copiar
 */
function copiarSolucion(btn, texto) {
    navigator.clipboard.writeText(texto).then(() => {
        // Feedback visual: cambia el texto del botón por 2 segundos
        const original = btn.textContent;
        btn.textContent = '✅ ¡Copiado!';
        btn.style.background = '#d1fae5';
        btn.style.color = '#065f46';
        setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.style.color = '';
        }, 2000);
    }).catch(() => {
        alert('No se pudo copiar. Usá Ctrl+C manualmente.');
    });
}

/**
 * Dispara el diálogo de impresión del navegador.
 * El @media print en style.css se encarga de ocultar el menú lateral
 * y mostrar solo el contenido del pizarrón.
 */
function imprimirPizarron() {
    window.print();
}

// =============================================================================
// GRÁFICA DE MÁXIMOS Y MÍNIMOS (Chart.js)
// =============================================================================

/**
 * Dibuja la curva de f(x) resaltando los puntos críticos (máximos en rojo, mínimos en verde).
 * @param {string}   f_str          - Expresión de la función (ej: "x^3 - 3*x")
 * @param {Array}    puntosCriticos - Arreglo de objetos {x, y, tipo} ('máximo local' | 'mínimo local')
 */
function dibujarGraficoMaxMin(f_str, puntosCriticos) {
    // Destruye la instancia anterior para evitar superposiciones
    if (chartMaxMin) { chartMaxMin.destroy(); chartMaxMin = null; }

    const canvas = document.getElementById('graficoMaxMin');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Compilamos la función una sola vez para evaluarla eficientemente
    const fEval = math.compile(f_str);
    const evalF = x => { try { return fEval.evaluate({ x }); } catch { return NaN; } };

    // Rango de la curva: alrededor de los puntos críticos o [-5, 5] por defecto
    const xs = puntosCriticos.map(p => p.x);
    const margen = 3;
    const xMin = (xs.length ? Math.min(...xs) : -5) - margen;
    const xMax = (xs.length ? Math.max(...xs) : 5)  + margen;

    // Generamos 300 puntos para una curva muy suave
    const pasos = 300;
    const etiquetas = [], valoresCurva = [];
    for (let i = 0; i <= pasos; i++) {
        const xi = xMin + (xMax - xMin) * (i / pasos);
        etiquetas.push(parseFloat(xi.toFixed(3)));
        const yi = evalF(xi);
        // Acotamos valores extremos para no romper la escala del gráfico
        valoresCurva.push(Number.isFinite(yi) ? parseFloat(yi.toFixed(4)) : null);
    }

    // Separamos los puntos críticos por tipo para colorearlos diferente
    const datosMaximos = puntosCriticos
        .filter(p => p.tipo === 'máximo local')
        .map(p => ({ x: p.x, y: p.y }));
    const datosMinimos = puntosCriticos
        .filter(p => p.tipo === 'mínimo local')
        .map(p => ({ x: p.x, y: p.y }));

    chartMaxMin = new Chart(ctx, {
        data: {
            labels: etiquetas,
            datasets: [
                {
                    // Curva continua de f(x)
                    type: 'line',
                    label: `f(x) = ${f_str}`,
                    data: valoresCurva,
                    borderColor: '#2563eb',
                    borderWidth: 2.5,
                    backgroundColor: 'rgba(37, 99, 235, 0.07)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 0,
                    spanGaps: true,   // une los segmentos aunque haya null en el medio
                    order: 3
                },
                {
                    // Máximos locales: marcas rojas
                    type: 'scatter',
                    label: 'Máximo local',
                    data: datosMaximos,
                    backgroundColor: '#ef4444',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    order: 1
                },
                {
                    // Mínimos locales: marcas verdes
                    type: 'scatter',
                    label: 'Mínimo local',
                    data: datosMinimos,
                    backgroundColor: '#16a34a',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        title: items => `x = ${parseFloat(items[0].label).toFixed(4)}`,
                        label: item  => `y = ${parseFloat(item.parsed.y).toFixed(4)}`
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'x' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                y: { title: { display: true, text: 'f(x)' }, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });
}

// =============================================================================
// GRÁFICA DE INTEGRAL DEFINIDA E INDEFINIDA (Chart.js)
// =============================================================================

/**
 * Dibuja la curva de f(x) sombreando el área bajo la curva entre [a, b].
 * Si no se especifican límites (integral indefinida), muestra la curva sin relleno parcial.
 * @param {string} f_str  - Expresión de la función (ej: "x^2")
 * @param {number} [a]    - Límite inferior de integración (opcional)
 * @param {number} [b]    - Límite superior de integración (opcional)
 */
function dibujarGraficoIntegral(f_str, a, b) {
    // Destruye la instancia anterior para evitar superposiciones
    if (chartIntegral) { chartIntegral.destroy(); chartIntegral = null; }

    const canvas = document.getElementById('graficoIntegral');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const fEval = math.compile(f_str);
    const evalF = x => { try { return fEval.evaluate({ x }); } catch { return NaN; } };

    // Determinamos el rango de la curva
    const tieneIntervalos = Number.isFinite(a) && Number.isFinite(b);
    const margen = tieneIntervalos ? Math.max((b - a) * 0.3, 1) : 3;
    const xMin = tieneIntervalos ? a - margen : -5;
    const xMax = tieneIntervalos ? b + margen :  5;

    const pasos = 250;
    const etiquetas = [], valoresCurva = [], valoresSombra = [];
    for (let i = 0; i <= pasos; i++) {
        const xi = xMin + (xMax - xMin) * (i / pasos);
        const yi = evalF(xi);
        const yFinito = Number.isFinite(yi) ? parseFloat(yi.toFixed(4)) : null;
        etiquetas.push(parseFloat(xi.toFixed(3)));
        valoresCurva.push(yFinito);
        // El relleno sombreado solo existe dentro del intervalo [a, b]
        if (tieneIntervalos && xi >= a && xi <= b) {
            valoresSombra.push(yFinito);
        } else {
            valoresSombra.push(null);
        }
    }

    chartIntegral = new Chart(ctx, {
        data: {
            labels: etiquetas,
            datasets: [
                {
                    // Área sombreada entre a y b (solo para integral definida)
                    type: 'line',
                    label: tieneIntervalos ? `Área [${a}, ${b}]` : 'f(x)',
                    data: valoresSombra,
                    borderColor: 'rgba(99, 102, 241, 0)',   // borde invisible
                    backgroundColor: 'rgba(99, 102, 241, 0.20)',
                    fill: 'origin',
                    tension: 0.35,
                    pointRadius: 0,
                    spanGaps: false,
                    order: 2
                },
                {
                    // Curva completa de f(x)
                    type: 'line',
                    label: `f(x) = ${f_str}`,
                    data: valoresCurva,
                    borderColor: '#2563eb',
                    borderWidth: 2.5,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.35,
                    pointRadius: 0,
                    spanGaps: true,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        title: items => `x = ${parseFloat(items[0].label).toFixed(4)}`,
                        label: item  => `y = ${parseFloat(item.parsed.y).toFixed(4)}`
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'x' }, grid: { color: 'rgba(0,0,0,0.05)' } },
                y: { title: { display: true, text: 'f(x)' }, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });
}

// Muestra u oculta los campos de entrada según el método de raíces seleccionado
function toggleRaizInputs() {
    // Obtiene el valor actual del menú desplegable (biseccion, reglaFalsa, newton)
    const metodo = document.getElementById("mRaiz").value;
    // Obtiene el contenedor HTML del intervalo [a, b]
    const divInt = document.getElementById("divInt");
    // Obtiene el contenedor HTML del valor inicial x0
    const divNew = document.getElementById("divNew");
    
    // Si el usuario eligió el método de Newton-Raphson
    if (metodo === "newton") {
        // Oculta el contenedor del intervalo
        divInt.style.display = "none";
        // Muestra el contenedor del valor inicial
        divNew.style.display = "block";
    } 
    // Si eligió Bisección o Regla Falsa
    else {
        // Muestra el contenedor del intervalo
        divInt.style.display = "block";
        // Oculta el contenedor del valor inicial
        divNew.style.display = "none";
    }
}

async function resolverRaices() {
    const fT = document.getElementById('fRaiz').value;
    const m = document.getElementById('mRaiz').value;
    const tol = parseFloat(document.getElementById('rTol').value);
    const sol = document.getElementById('solRaiz');
    try {
        const f = (x) => math.evaluate(fT, { x });
        let diag = [`¡Hola! Soy <strong>Ñioo</strong>. Busquemos esa raíz. 🔍`];
        if (m === 'newton') {
            const x0 = parseFloat(document.getElementById('rX0').value);
            if (isNaN(x0)) return mostrarAdvertencia(sol);
            const dfT = math.derivative(fT, 'x').toString();
            const df = (x) => math.evaluate(dfT, { x });
            diag.push(`Para Newton, necesito la derivada: <br>f'(x) = ${dfT}`);
            let x = x0, iter = 0;
            while (iter < 10) {
                iter++;
                let fx = f(x), dfx = df(x);
                if (Math.abs(fx) < tol) break;
                let xSig = x - fx / dfx;
                diag.push(`Iter ${iter}: x = ${x.toFixed(4)} → xₙ₊₁ = <strong style="color:#2563eb;">${xSig.toFixed(4)}</strong>`);
                x = xSig;
            }
            diag.push(`FORMULA: <strong style="font-size:1.5em; color:#2563eb;">Raíz ≈ ${x.toFixed(4)}</strong>`);
            niooDice(diag, 'solRaiz');
        } else {
            const a = parseFloat(document.getElementById('rA').value), b = parseFloat(document.getElementById('rB').value);
            if (isNaN(a) || isNaN(b)) return mostrarAdvertencia(sol);
            const fa = f(a), fb = f(b);
            diag.push(`Primero, el <strong>Teorema de Bolzano</strong>: Evaluamos f(${a})=${fa.toFixed(2)} y f(${b})=${fb.toFixed(2)}.`);
            if (fa * fb >= 0) {
                diag.push(`⚠️ <strong>¡Alto!</strong> No hay cambio de signo. No podemos asegurar una raíz aquí.`);
                niooDice(diag, 'solRaiz'); return;
            }
            diag.push(`¡Perfecto! Hay cambio de signo, así que <strong>SÍ hay una raíz</strong>. Usando ${m === 'biseccion' ? 'Bisección' : 'Regla Falsa'}...`);
            let x = a, iter = 0, la = a, lb = b;
            while (iter < 10) {
                iter++;
                if (m === 'biseccion') x = (la + lb) / 2;
                else { let fla = f(la), flb = f(lb); x = (la * flb - lb * fla) / (flb - fla); }
                let fx = f(x);
                diag.push(`Iter ${iter}: x = ${x.toFixed(4)}, f(x) = ${fx.toFixed(4)}.`);
                if (Math.abs(fx) < tol) break;
                if (f(la) * fx < 0) lb = x; else la = x;
            }
            diag.push(`FORMULA: <strong style="font-size:1.5em; color:#2563eb;">Raíz ≈ ${x.toFixed(4)}</strong>`);
            niooDice(diag, 'solRaiz');
        }
    } catch (e) { sol.innerHTML = `<p>⚠️ Error en la función.</p>`; }
}

// Resuelve sistema 2x2 por Cramer y limpia el símbolo * de la entrada
async function resolverSistema() {
    const e1S = document.getElementById("eq1").value, e2S = document.getElementById("eq2").value, sol = document.getElementById("solSistema");
    if(!e1S || !e2S) return mostrarAdvertencia(sol);
    // Verifica si la ecuación tiene el signo de igual
    if(!e1S.includes("=") || !e2S.includes("=")) return mostrarAdvertencia(sol);
    
    function p(eq) {
        // Quita los signos de multiplicación (*) del texto
        eq = eq.replace(/\*/g, "");
        const parts = eq.split("=");
        const izq = parts[0].replace(/\s/g, "").replace(/-/g, "+-").replace(/^\+/, "");
        const der = Number(parts[1]);
        let x=0, y=0;
        for(let t of izq.split("+")) {
            if(!t) continue;
            if(t.includes("x")) { let c=t.replace("x",""); x += (c===""||c=="+")?1:(c=="-"?-1:Number(c)); }
            else if(t.includes("y")) { let c=t.replace("y",""); y += (c===""||c=="+")?1:(c=="-"?-1:Number(c)); }
        }
        return {a:x, b:y, c:der};
    }
    const e1 = p(e1S), e2 = p(e2S);
    // Verifica que el término independiente (lado derecho) sea un número válido
    if (isNaN(e1.c) || isNaN(e2.c)) return mostrarAdvertencia(sol);
    
    const det = (e1.a*e2.b)-(e1.b*e2.a);
    if(det===0) return sol.innerHTML = `<p>⚠️ Sin solución única.</p>`;
    
    // Cálculo de determinantes de X e Y
    const detX = (e1.c*e2.b)-(e1.b*e2.c);
    const detY = (e1.a*e2.c)-(e1.c*e2.a);
    const x = detX/det;
    const y = detY/det;
    
    let diag = [
        `¡Hola! Soy <strong>Ñioo</strong>. Vamos a resolver este sistema. 🧮`,
        `Usaré el <strong>Método de Cramer</strong>. Primero calculo el determinante principal (Δ):`,
        `FORMULA: Δ = (${e1.a} * ${e2.b}) - (${e1.b} * ${e2.a}) = <strong style="color:#2563eb;">${det}</strong>`,
        `Calculo los determinantes de x (Δx) e y (Δy):`,
        `FORMULA: Δx = (${e1.c} * ${e2.b}) - (${e1.b} * ${e2.c}) = <strong style="color:#2563eb;">${detX}</strong>`,
        `FORMULA: Δy = (${e1.a} * ${e2.c}) - (${e1.c} * ${e2.a}) = <strong style="color:#2563eb;">${detY}</strong>`,
        `Por último dividimos: x = Δx/Δ e y = Δy/Δ`,
        `FORMULA: <strong style="font-size:1.5em; color:#2563eb;">x = ${x.toFixed(2)}, y = ${y.toFixed(2)}</strong>`
    ];
    niooDice(diag, 'solSistema');
    guardarEnHistorial(`Sistema 2x2`, `x=${x.toFixed(2)}, y=${y.toFixed(2)}`);
}

// Calcula el límite analizando por izquierda y por derecha
async function calcLim() {
    const fS = document.getElementById("fLim").value, a = parseFloat(document.getElementById("pA").value);
    const sol = document.getElementById("solLim");
    if (!fS || isNaN(a)) return mostrarAdvertencia(sol);
    try {
        const ex = math.compile(fS);
        const h = 0.0001;
        const izq = ex.evaluate({x: a-h}), der = ex.evaluate({x: a+h});
        
        let diag = [
            `¡Hola! Soy <strong>Ñioo</strong>. Vamos a calcular este límite. 🎯`,
            `Para saber a qué valor tiende la función, evaluamos puntos muy cercanos a ${a}:`,
            `Por la izquierda (x → ${a}⁻): <strong style="color:#2563eb;">${izq.toFixed(4)}</strong>`,
            `Por la derecha (x → ${a}⁺): <strong style="color:#2563eb;">${der.toFixed(4)}</strong>`
        ];
        
        // Verifica si algún valor es infinito o NaN
        if (isNaN(izq) || isNaN(der) || Math.abs(izq) > 1e6 || Math.abs(der) > 1e6) {
            diag.push(`⚠️ La función tiende a infinito o no está definida en este punto, por lo tanto el límite NO existe.`);
            niooDice(diag, 'solLim');
            return;
        }

        // Compara si coinciden dentro de la tolerancia
        if (Math.abs(izq - der) <= 0.001) {
            const res = (izq + der) / 2;
            diag.push(
                `Como ambos valores coinciden, el límite existe:`,
                `FORMULA: <strong style="font-size:1.5em; color:#2563eb;">lim x→${a} f(x) ≈ ${res.toFixed(4)}</strong>`
            );
            niooDice(diag, 'solLim');
            guardarEnHistorial(`Límite x→${a}`, `L ≈ ${res.toFixed(4)}`);
        } else {
            diag.push(`⚠️ Los límites laterales son distintos. ¡El límite NO existe!`);
            niooDice(diag, 'solLim');
        }
    } catch(e){ sol.innerHTML = `<p>⚠️ Error.</p>`; }
}

async function calcDer() {
    const f = document.getElementById("fDer").value, sol = document.getElementById("solDer");
    if (!f) return mostrarAdvertencia(sol);
    try {
        const res = math.derivative(f, 'x').toString();
        let diag = [
            `¡Hola! Soy <strong>Ñioo</strong>. Vamos a derivar esta función. 📉`,
            `Aplico las reglas de derivación (como la regla de la potencia o la cadena):`,
            `FORMULA: <strong style="font-size:1.5em; color:#2563eb;">f'(x) = ${res}</strong>`,
            `¡Listo! Recuerda que la derivada representa la pendiente de la recta tangente.`
        ];
        niooDice(diag, 'solDer');
        guardarEnHistorial(`Derivada: ${f}`, `f'=${res}`);
    } catch(e){ sol.innerHTML = `<p>⚠️ Error.</p>`; }
}

async function calcMaxMin() {
    const f = document.getElementById("fMax").value, sol = document.getElementById("solMax");
    if (!f) return mostrarAdvertencia(sol);
    try {
        const d1 = math.derivative(f, 'x'), d2 = math.derivative(d1, 'x');
        const fEval = math.compile(f), d1Eval = math.compile(d1.toString()), d2Eval = math.compile(d2.toString());
        const puntos = [];
        const agregarPunto = (x) => {
            if (!Number.isFinite(x) || puntos.some(p => Math.abs(p - x) < 1e-5)) return;
            puntos.push(x);
        };
        const evaluarD1 = (x) => {
            try {
                const valor = d1Eval.evaluate({ x });
                return Number.isFinite(valor) ? valor : NaN;
            } catch (e) { return NaN; }
        };
        // Recorremos la grilla y refinamos cada cambio de signo con bisección.
        let anteriorX = -10, anterior = evaluarD1(anteriorX);
        for (let i = 0; i <= 200; i++) {
            const x = -10 + i * 0.1, actual = evaluarD1(x);
            if (Number.isFinite(actual) && Math.abs(actual) < 1e-9) agregarPunto(x);
            if (Number.isFinite(anterior) && Number.isFinite(actual) && anterior * actual < 0) {
                let izquierda = anteriorX, derecha = x;
                for (let j = 0; j < 60 && derecha - izquierda > 1e-6; j++) {
                    const mitad = (izquierda + derecha) / 2, valorMitad = evaluarD1(mitad);
                    if (!Number.isFinite(valorMitad)) break;
                    if (Math.abs(valorMitad) < 1e-9) { izquierda = mitad; derecha = mitad; break; }
                    if (anterior * valorMitad <= 0) derecha = mitad;
                    else { izquierda = mitad; anterior = valorMitad; }
                }
                agregarPunto((izquierda + derecha) / 2);
            }
            anteriorX = x; anterior = actual;
        }
        puntos.sort((a, b) => a - b);
        let diag = [
            `¡Hola! Soy <strong>Ñioo</strong>. Vamos a analizar los puntos críticos. 📌`,
            `Primero, calculamos la primera derivada para buscar donde la pendiente es cero:`,
            `FORMULA: f'(x) = ${d1.toString()}`,
            `Luego, usamos la segunda derivada para saber si es un Máximo o Mínimo (concavidad):`,
            `FORMULA: f''(x) = ${d2.toString()}`,
            `Busco f'(x) = 0 en el intervalo [-10, 10], con una grilla de paso 0.1 y bisección (tolerancia 0.000001).`
        ];
        if (puntos.length === 0) {
            diag.push(`No encontré puntos críticos en [-10, 10].`);
        } else {
            diag.push(`Puntos críticos encontrados: ${puntos.map(x => x.toFixed(4)).join(', ')}.`);
            puntos.forEach(x0 => {
                const segunda = d2Eval.evaluate({ x: x0 });
                let conclusion = '';
                if (Number.isFinite(segunda) && Math.abs(segunda) >= 1e-6) {
                    conclusion = segunda > 0 ? 'mínimo local' : 'máximo local';
                } else {
                    const izquierda = evaluarD1(x0 - 0.01), derecha = evaluarD1(x0 + 0.01);
                    if (izquierda > 0 && derecha < 0) conclusion = 'máximo local';
                    else if (izquierda < 0 && derecha > 0) conclusion = 'mínimo local';
                    else conclusion = 'no es un extremo local';
                }
                const fx = fEval.evaluate({ x: x0 });
                diag.push(`En x₀ = ${x0.toFixed(4)}, f''(x₀) = ${Number(segunda).toFixed(4)}: ${conclusion}. f(x₀) = ${Number(fx).toFixed(4)}.`);
            });
        }
        // Esperamos a que Ñioo termine de mostrar el diálogo
        await niooDice(diag, 'solMax');
        guardarEnHistorial(`Máximos y mínimos: ${f}`, `${puntos.length} punto(s) crítico(s)`);

        // ─── GRÁFICA INTERACTIVA ──────────────────────────────────────────────
        const solMax = document.getElementById('solMax');

        // Armamos el arreglo de puntos críticos con su tipo para colorear el scatter
        const puntosCriticosGraf = puntos.map(x0 => {
            const segunda = d2Eval.evaluate({ x: x0 });
            let tipo = 'no es un extremo local';
            if (Number.isFinite(segunda) && Math.abs(segunda) >= 1e-6) {
                tipo = segunda > 0 ? 'mínimo local' : 'máximo local';
            } else {
                const izq = d1Eval.evaluate({ x: x0 - 0.01 });
                const der = d1Eval.evaluate({ x: x0 + 0.01 });
                if (izq > 0 && der < 0) tipo = 'máximo local';
                else if (izq < 0 && der > 0) tipo = 'mínimo local';
            }
            return { x: x0, y: parseFloat(fEval.evaluate({ x: x0 }).toFixed(4)), tipo };
        });

        // Insertamos el canvas en el DOM
        const contenedorGrafMax = document.createElement('div');
        contenedorGrafMax.className = 'contenedor-grafico';
        contenedorGrafMax.innerHTML = `
            <h4 style="margin:0 0 10px; color:#2563eb; font-family:'Poppins',sans-serif;">📈 Gráfica de f(x) con puntos críticos</h4>
            <canvas id="graficoMaxMin"></canvas>
        `;
        solMax.appendChild(contenedorGrafMax);
        dibujarGraficoMaxMin(f, puntosCriticosGraf);

        // ─── BOTONERA DE EXPORTACIÓN ─────────────────────────────────────────
        const textoMaxMin = [
            `=== Máximos y Mínimos - MateSolve ===`,
            `f(x) = ${f}`,
            `f'(x) = ${d1.toString()} | f''(x) = ${d2.toString()}`,
            puntos.length ? `Puntos críticos: ${puntos.map(x0 => x0.toFixed(4)).join(', ')}` : 'Sin puntos críticos en [-10, 10]'
        ].join('\n');
        const barraMax = document.createElement('div');
        barraMax.className = 'barra-exportacion';
        barraMax.innerHTML = `
            <button class="btn-exportar" onclick="copiarSolucion(this, \`${textoMaxMin.replace(/`/g, "'")}\`)">📋 Copiar Solución</button>
            <button class="btn-exportar" onclick="imprimirPizarron()">📥 Imprimir Reporte</button>
        `;
        solMax.appendChild(barraMax);

    } catch(e){ sol.innerHTML = `<p>⚠️ Error.</p>`; }
}

// Calcula la integral definida usando la Regla del Trapecio
async function calcInt() {
    const fS = document.getElementById("fInt").value, a = parseFloat(document.getElementById("lA").value), b = parseFloat(document.getElementById("lB").value);
    const sol = document.getElementById("solInt");
    if (!fS || isNaN(a) || isNaN(b)) return mostrarAdvertencia(sol);
    // Si el límite inferior es mayor al superior, advertimos al usuario
    if (a > b) return sol.innerHTML = `<p style="color:red;">⚠️ Error: El límite inferior 'a' debe ser menor o igual que 'b'.</p>`;
    try {
        const ex = math.compile(fS);
        const n = 1000, h = (b-a)/n;
        // Regla del trapecio: dividimos por 2 los extremos
        let sum = (ex.evaluate({x: a}) + ex.evaluate({x: b})) / 2;
        // Sumamos los puntos interiores
        for(let i=1; i<n; i++) sum += ex.evaluate({x: a + (i*h)});
        const res = sum * h;
        let diag = [
            `¡Hola! Soy <strong>Ñioo</strong>. Calcularemos el área bajo la curva. ∫`,
            `Usamos la regla del trapecio real con ${n} subdivisiones (h = ${h}) entre ${a} y ${b}:`,
            `FORMULA: Área ≈ h × [ f(a)/2 + Σ f(x_i) + f(b)/2 ]`,
            `FORMULA: <strong style="font-size:1.5em; color:#2563eb;">Área ≈ ${res.toFixed(6)}</strong>`,
            `¡Listo! Este valor representa el espacio acumulado bajo la función.`
        ];
        // Esperamos a que Ñioo termine
        await niooDice(diag, 'solInt');
        guardarEnHistorial(`Integral [${a},${b}]`, `Área ≈ ${res.toFixed(4)}`);

        // ─── GRÁFICA INTERACTIVA ──────────────────────────────────────────────
        const solInt = document.getElementById('solInt');
        const contenedorGrafInt = document.createElement('div');
        contenedorGrafInt.className = 'contenedor-grafico';
        contenedorGrafInt.innerHTML = `
            <h4 style="margin:0 0 10px; color:#2563eb; font-family:'Poppins',sans-serif;">∫ Área bajo la curva entre [${a}, ${b}]</h4>
            <canvas id="graficoIntegral"></canvas>
        `;
        solInt.appendChild(contenedorGrafInt);
        dibujarGraficoIntegral(fS, a, b);

        // ─── BOTONERA DE EXPORTACIÓN ─────────────────────────────────────────
        const textoInt = [
            `=== Integral Definida - MateSolve ===`,
            `f(x) = ${fS}`,
            `Intervalo: [${a}, ${b}]`,
            `Área ≈ ${res.toFixed(6)} (Regla del Trapecio, n=1000)`
        ].join('\n');
        const barraInt = document.createElement('div');
        barraInt.className = 'barra-exportacion';
        barraInt.innerHTML = `
            <button class="btn-exportar" onclick="copiarSolucion(this, \`${textoInt.replace(/`/g, "'")}\`)">📋 Copiar Solución</button>
            <button class="btn-exportar" onclick="imprimirPizarron()">📥 Imprimir Reporte</button>
        `;
        solInt.appendChild(barraInt);

    } catch(e){ sol.innerHTML = `<p>⚠️ Error.</p>`; }
}

async function calcIndef() {
    const f = document.getElementById("fIndef").value, sol = document.getElementById("solIndef");
    if (!f) return mostrarAdvertencia(sol);
    try {
        // Separamos recursivamente los sumandos y conservamos el signo de cada uno.
        const separar = (node, signo = 1) => {
            if (node.type === 'OperatorNode' && (node.op === '+' || node.op === '-')) {
                return [...separar(node.args[0], signo), ...separar(node.args[1], signo * (node.op === '+' ? 1 : -1))];
            }
            if (node.type === 'UnaryMinusNode') return separar(node.args[0], -signo);
            return [{ node, signo }];
        };
        const numero = node => node && node.type === 'ConstantNode' && Number.isFinite(Number(node.value));
        const valor = node => Number(node.value);
        const analizar = node => {
            if (numero(node)) return { tipo: 'constante', c: valor(node) };
            if (node.type === 'SymbolNode' && node.name === 'x') return { tipo: 'potencia', c: 1, n: 1 };
            if (node.type === 'OperatorNode' && node.op === '^' && node.args[0].type === 'SymbolNode' && node.args[0].name === 'x' && numero(node.args[1])) {
                return { tipo: 'potencia', c: 1, n: valor(node.args[1]) };
            }
            if (node.type === 'OperatorNode' && node.op === '/' && numero(node.args[0]) && node.args[1].type === 'SymbolNode' && node.args[1].name === 'x') {
                return { tipo: 'inversa', c: valor(node.args[0]) };
            }
            if (node.type === 'FunctionNode' && ['sin', 'cos', 'exp'].includes(node.fn.name) && node.args[0].toString() === 'x') {
                return { tipo: node.fn.name, c: 1 };
            }
            if (node.type === 'OperatorNode' && node.op === '*') {
                const partes = [node.args[0], node.args[1]], indice = partes.findIndex(numero);
                if (indice !== -1) {
                    const base = analizar(partes[1 - indice]);
                    if (base) { base.c *= valor(partes[indice]); return base; }
                }
            }
            return null;
        };
        const fraccion = n => {
            for (let den = 1; den <= 1000; den++) {
                const num = Math.round(n * den);
                if (Math.abs(n - num / den) < 1e-10) return { num, den };
            }
            return null;
        };
        const basePotencia = n => Number.isInteger(n) && n >= 0 && n <= 9 ? ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'][n] : `^${n}`;
        const multiplicarTexto = (c, base) => {
            const abs = Math.abs(c), frac = fraccion(abs);
            if (Math.abs(abs - 1) < 1e-12) return base;
            if (frac && frac.den !== 1) return frac.num === 1 ? `${base}/${frac.den}` : `${frac.num}*${base}/${frac.den}`;
            return `${abs.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}*${base}`;
        };
        const partes = separar(math.parse(f));
        const resultados = [], expresiones = [], explicaciones = [];
        for (const parte of partes) {
            const t = analizar(parte.node);
            if (!t || (t.tipo === 'potencia' && t.n === -1)) throw new Error('no soportado');
            const c = parte.signo * t.c;
            if (t.tipo === 'constante') { resultados.push({ c, texto: multiplicarTexto(c, 'x') }); expresiones.push(`${c}*x`); explicaciones.push(`∫ ${parte.node} dx = ${multiplicarTexto(c, 'x')}`); }
            else if (t.tipo === 'potencia') { const k = c / (t.n + 1), exponente = t.n + 1, base = `x${basePotencia(exponente)}`; resultados.push({ c: k, texto: multiplicarTexto(k, base) }); expresiones.push(`${k}*x^(${exponente})`); explicaciones.push(`∫ ${parte.node} dx = xⁿ⁺¹/(n+1)`); }
            else if (t.tipo === 'sin') { resultados.push({ c: -c, texto: multiplicarTexto(-c, 'cos(x)') }); expresiones.push(`${-c}*cos(x)`); explicaciones.push(`∫ sin x dx = −cos x`); }
            else if (t.tipo === 'cos') { resultados.push({ c, texto: multiplicarTexto(c, 'sin(x)') }); expresiones.push(`${c}*sin(x)`); explicaciones.push(`∫ cos x dx = sin x`); }
            else if (t.tipo === 'exp') { resultados.push({ c, texto: multiplicarTexto(c, 'exp(x)') }); expresiones.push(`${c}*exp(x)`); explicaciones.push(`∫ eˣ dx = eˣ`); }
            else if (t.tipo === 'inversa') { resultados.push({ c, texto: multiplicarTexto(c, 'ln|x|') }); expresiones.push(`${c}*log(abs(x))`); explicaciones.push(`∫ 1/x dx = ln|x|`); }
        }
        const unir = lista => lista.map((item, i) => `${i === 0 ? (item.c < 0 ? '-' : '') : (item.c < 0 ? ' - ' : ' + ')}${item.texto}`).join('');
        const resultado = `${unir(resultados)} + C`;
        let verificado = false;
        try {
            const derivada = math.derivative(expresiones.join(' + '), 'x');
            const original = math.compile(f), calculada = math.compile(derivada.toString());
            verificado = [0.5, 1.5, 2.5].every(x => Math.abs(original.evaluate({ x }) - calculada.evaluate({ x })) < 1e-6);
        } catch (e) { verificado = false; }
        const diag = [`¡Hola! Soy <strong>Ñioo</strong>. Vamos a buscar la antiderivada. ∫`, ...explicaciones, `FORMULA: <strong style="font-size:1.5em; color:#2563eb;">${resultado}</strong>`];
        if (verificado) diag.push('✔ Verificación: al derivar el resultado volvemos a f(x)');
        // Esperamos a que Ñioo termine
        await niooDice(diag, 'solIndef');
        guardarEnHistorial(`Integral indefinida: ${f}`, resultado);

        // ─── GRÁFICA DE f(x) (sin área sombreada, sin límites) ────────────────
        const solIndef = document.getElementById('solIndef');
        const contenedorGrafIndef = document.createElement('div');
        contenedorGrafIndef.className = 'contenedor-grafico';
        contenedorGrafIndef.innerHTML = `
            <h4 style="margin:0 0 10px; color:#2563eb; font-family:'Poppins',sans-serif;">∫ Gráfica de f(x) = ${f}</h4>
            <canvas id="graficoIntegral"></canvas>
        `;
        solIndef.appendChild(contenedorGrafIndef);
        // Sin límites: a y b quedan como NaN → dibujarGraficoIntegral usa rango por defecto
        dibujarGraficoIntegral(f, NaN, NaN);

        // ─── BOTONERA DE EXPORTACIÓN ─────────────────────────────────────────
        const textoIndef = [
            `=== Integral Indefinida - MateSolve ===`,
            `f(x) = ${f}`,
            `Resultado: ${resultado}`
        ].join('\n');
        const barraIndef = document.createElement('div');
        barraIndef.className = 'barra-exportacion';
        barraIndef.innerHTML = `
            <button class="btn-exportar" onclick="copiarSolucion(this, \`${textoIndef.replace(/`/g, "'")}\`)">📋 Copiar Solución</button>
            <button class="btn-exportar" onclick="imprimirPizarron()">📥 Imprimir Reporte</button>
        `;
        solIndef.appendChild(barraIndef);

    } catch(e) {
        niooDice([`Por ahora resuelvo polinomios y funciones básicas.`], 'solIndef');
    }
}

async function calcMat() {
    const v = ["m00", "m01", "m10", "m11"].map(id => parseFloat(document.getElementById(id).value));
    const sol = document.getElementById("solMat");
    if(v.some(isNaN)) return mostrarAdvertencia(sol);
    const det = (v[0]*v[3])-(v[1]*v[2]);
    let diag = [
        `¡Hola! Soy <strong>Ñioo</strong>. Vamos a calcular el determinante. 🔢`,
        `Para una matriz 2x2, multiplicamos la diagonal principal y restamos la diagonal secundaria:`,
        `FORMULA: (${v[0]} × ${v[3]}) - (${v[1]} × ${v[2]})`,
        `FORMULA: <strong style="font-size:1.5em; color:#2563eb;">Det = ${det}</strong>`
    ];
    niooDice(diag, 'solMat');
    guardarEnHistorial(`Matriz 2x2`, `Det = ${det}`);
}

function graficar() {
    const fS = document.getElementById("fGraf").value, sol = document.getElementById("solGraf");
    try {
        sol.innerHTML = `<canvas id="cGraf"></canvas>`;
        setTimeout(() => {
            const ctx = document.getElementById("cGraf").getContext("2d");
            const vX = [], vY = [];
            const ex = math.compile(fS);
            for(let x=-10; x<=10; x+=0.5) { vX.push(x.toFixed(1)); vY.push(ex.evaluate({x})); }
            new Chart(ctx, { type: "line", data: { labels: vX, datasets: [{ label: fS, data: vY, borderColor: "#2563eb", fill: false }] } });
        }, 100);
    } catch(e){ sol.innerHTML = `<p>⚠️ Error.</p>`; }
}

// =============================================================================
// CENTRO DE PRÁCTICA COMPLETO
// =============================================================================

function nuevoEjerc() {
    const tipo = document.getElementById("tPrac")?.value || "sistema";
    const ej = document.getElementById("ejPrac");
    const resInput = document.getElementById("resPrac");
    const resDiv = document.getElementById("resPracDiv");
    if (!ej) return;
    if (resInput) resInput.value = "";
    if (resDiv) resDiv.innerHTML = "";

    let enunciado = "";
    switch(tipo) {
        case "sistema":
            let a1, b1, a2, b2, detS;
            // Regenera coeficientes hasta asegurar que el determinante no sea cero
            do {
                a1 = Math.floor(Math.random() * 5) + 1;
                b1 = Math.floor(Math.random() * 5) + 1;
                a2 = Math.floor(Math.random() * 5) + 1;
                b2 = Math.floor(Math.random() * 5) + 1;
                detS = (a1 * b2) - (b1 * a2);
            } while (detS === 0);
            const xS = Math.floor(Math.random() * 10) + 1, yS = Math.floor(Math.random() * 10) + 1;
            const c1 = a1 * xS + b1 * yS;
            const c2 = a2 * xS + b2 * yS;
            respuestaCorrecta = String(xS);
            enunciado = `Hallá el valor de <strong style="color:#2563eb;">x</strong> en el sistema:<br>1) ${a1}x + ${b1}y = ${c1}<br>2) ${a2}x + ${b2}y = ${c2}`;
            break;
        case "interpolacion":
            const x0 = Math.floor(Math.random() * 5), h_int = 1, slope = Math.floor(Math.random() * 5) + 2, intercept = Math.floor(Math.random() * 10);
            const y0 = slope * x0 + intercept, y1 = slope * (x0 + 1) + intercept, y2 = slope * (x0 + 2) + intercept;
            const evalX = x0 + 1.5;
            respuestaCorrecta = String(slope * evalX + intercept);
            enunciado = `Dados los puntos <strong style="color:#2563eb;">(${x0}, ${y0}), (${x0+1}, ${y1}), (${x0+2}, ${y2})</strong>, interpolá para <strong style="color:#2563eb;">x = ${evalX}</strong>.`;
            break;
        case "raices":
            const root = Math.floor(Math.random() * 10) + 1;
            respuestaCorrecta = String(root);
            enunciado = `Encontrá la raíz positiva de: <strong style="color:#2563eb;">f(x) = x^2 - ${root * root}</strong>`;
            break;
        case "limites":
            const valA = Math.floor(Math.random() * 5) + 1;
            respuestaCorrecta = String(valA * 2);
            enunciado = `Calculá el límite: <strong style="color:#2563eb;">lim x→${valA} (2x)</strong>`;
            break;
        case "derivadas":
            const p_der = Math.floor(Math.random() * 5) + 2, a_der = Math.floor(Math.random() * 5) + 1;
            // Si la potencia final es 1, omitimos escribir el exponente
            const expFinal = p_der - 1;
            respuestaCorrecta = expFinal === 1 ? `${a_der * p_der}x` : `${a_der * p_der}x^${expFinal}`;
            enunciado = `¿Cuál es la derivada de <strong style="color:#2563eb;">f(x) = ${a_der}x^${p_der}</strong>?`;
            break;
        case "integrales":
            const c_int = Math.floor(Math.random() * 5) + 1;
            respuestaCorrecta = String((c_int * 4) / 2);
            enunciado = `Calculá la integral definida de <strong style="color:#2563eb;">∫ ${c_int}x dx</strong> en el intervalo <strong style="color:#2563eb;">[0, 2]</strong>.`;
            break;
        case "matrices":
            const m00 = Math.floor(Math.random() * 5) + 1, m01 = Math.floor(Math.random() * 5) + 1;
            const m10 = Math.floor(Math.random() * 5) + 1, m11 = Math.floor(Math.random() * 5) + 1;
            respuestaCorrecta = String((m00 * m11) - (m01 * m10));
            enunciado = `Calculá el determinante de: <strong style="color:#2563eb;">[${m00}, ${m01}]<br>[${m10}, ${m11}]</strong>`;
            break;
    }
    ej.innerHTML = enunciado;
}

function checkRes() {
    const resInput = document.getElementById("resPrac");
    const resDiv = document.getElementById("resPracDiv");
    if (!resInput || resInput.value === "") return;
    // Normaliza quitando espacios y asteriscos para aceptar "6*x" y "6x"
    const valUsuario = resInput.value.trim().toLowerCase().replace(/\s|\*/g, "");
    const valEsperado = respuestaCorrecta.toLowerCase().replace(/\s|\*/g, "");
    if (valUsuario === valEsperado) {
        rachaAciertos++;
        resDiv.innerHTML = `<h3 style="color:#16a34a;">🎉 ¡Correcto! ¡Seguí así!</h3>`;
    } else {
        rachaAciertos = 0;
        resDiv.innerHTML = `<h3 style="color:#dc2626;">❌ Incorrecto. Era <strong style="color:#1e3a8a;">${respuestaCorrecta}</strong></h3>`;
    }
    document.getElementById("racha-count").innerText = rachaAciertos;
    document.getElementById("nivel-badge").innerText = obtenerRangoNivel(rachaAciertos);
}
