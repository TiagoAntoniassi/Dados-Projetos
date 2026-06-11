const { useState } = React;

// Injeta animação de loading para o botão Salvar
(function() {
  const style = document.createElement("style");
  style.textContent = "@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }";
  document.head.appendChild(style);
})();

const MONTHS_LABELS = [
  "1º month", "2º month", "3º month", "4º month",
  "5º month", "6º month", "7º month", "8º month",
  "9º month", "10º month", "11º month", "12º month",
];

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const COUNTRIES = [
  { code: "BR", label: "🇧🇷 Brasil" },
  { code: "AR", label: "🇦🇷 Argentina" },
  { code: "CL", label: "🇨🇱 Chile" },
  { code: "CO", label: "🇨🇴 Colômbia" },
  { code: "MX", label: "🇲🇽 México" },
  { code: "PY", label: "🇵y Paraguai" },
  { code: "EC", label: "EC Ecuador" },
  { code: "UY", label: "UY Uruguai" },
  { code: "PE", label: "🇵🇪 Peru" },
  { code: "BO", label: "bo Bolivia" },
  { code: "PC", label: "pc Costa Rica" }
];

// Calcula o rótulo de exibição em tela de forma segura contra fuso horário
function getMonthLabel(startDate, idx) {
  if (!startDate) return MONTHS_LABELS[idx];
  const [year, month] = startDate.split("-").map(Number);
  // Usa o dia 15 para evitar que shifts de timezone mudem o mês final
  const d = new Date(year, month - 1 + idx, 15);
  return `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

// Formata a data para a planilha no modelo unpivot desejado (ex: fev-27)
function formatMonthYear(startDate, idx) {
  if (!startDate) return "";
  const [year, month] = startDate.split("-").map(Number);
  const d = new Date(year, month - 1 + idx, 15);
  const monthsPt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${monthsPt[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

const emptyMonthValues = () => Array(12).fill("");

function createInitialState() {
  const firstSkuId = Date.now();
  return {
    projectName: "",
    skus: [{ id: firstSkuId, value: "", countries: [] }],
    productionStartDateBySku: { [firstSkuId]: "" },
    productionMonthsBySku: { [firstSkuId]: emptyMonthValues() },
    salesStartDateBySku: { [firstSkuId]: "" },
    salesMonthsBySku: { [firstSkuId]: emptyMonthValues() },
    om1Target: "",
    mavDates: {}, // Modificado para armazenar { [skuId]: { [countryCode]: date } }
    solDates: {}, // Modificado para armazenar { [skuId]: { [countryCode]: date } }
  };
}

// Garante que todo SKU existente tenha seu array de meses e data de início inicializado
function ensureSkuMonths(monthsBySku, skus) {
  const updated = { ...monthsBySku };
  skus.forEach(s => {
    if (!updated[s.id]) updated[s.id] = emptyMonthValues();
  });
  return updated;
}

function ensureSkuStartDates(startDateBySku, skus) {
  const updated = { ...startDateBySku };
  skus.forEach(s => {
    if (updated[s.id] === undefined) updated[s.id] = "";
  });
  return updated;
}

const STEPS = ["Projeto", "SKUs", "Produção", "Vendas", "OM1 Target", "Datas", "Revisão"];

// ─── CONFIGURAÇÃO — cole aqui a URL do seu Google Apps Script ───────────────
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwc2yACEAkMD5T4XOWLtutiHaPDPEwDFa8K8cMfTOyWmIkQmchepOmM7NxmAArORjJX/exec";
// ─────────────────────────────────────────────────────────────────────────────

function ProjectDataCollector() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(createInitialState);
  const [submitted, setSubmitted] = useState(false);
  const [allProjects, setAllProjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [activeProdSkuId, setActiveProdSkuId] = useState(null);
  const [activeSalesSkuId, setActiveSalesSkuId] = useState(null);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const updateStartDateBySku = (type, skuId, value) => {
    const key = type === "prod" ? "productionStartDateBySku" : "salesStartDateBySku";
    setForm(f => ({
      ...f,
      [key]: { ...f[key], [skuId]: value }
    }));
  };

  const updateMonthVal = (type, skuId, idx, val) => {
    const key = type === "prod" ? "productionMonthsBySku" : "salesMonthsBySku";
    setForm(f => {
      const bySkuCopy = { ...f[key] };
      const arr = [...(bySkuCopy[skuId] || emptyMonthValues())];
      arr[idx] = val;
      bySkuCopy[skuId] = arr;
      return { ...f, [key]: bySkuCopy };
    });
  };

  // Atualiza a data MAV ou SOL de um SKU e País específico
  const updateCountryDate = (type, skuId, countryCode, value) => {
    const key = type === "mav" ? "mavDates" : "solDates";
    setForm(f => {
      const skuDates = f[key][skuId] || {};
      return {
        ...f,
        [key]: {
          ...f[key],
          [skuId]: { ...skuDates, [countryCode]: value }
        }
      };
    });
  };

  const addSku = () =>
    setForm(f => {
      const newSku = { id: Date.now(), value: "", countries: [] };
      return {
        ...f,
        skus: [...f.skus, newSku],
        productionStartDateBySku: { ...f.productionStartDateBySku, [newSku.id]: "" },
        productionMonthsBySku: { ...f.productionMonthsBySku, [newSku.id]: emptyMonthValues() },
        salesStartDateBySku: { ...f.salesStartDateBySku, [newSku.id]: "" },
        salesMonthsBySku: { ...f.salesMonthsBySku, [newSku.id]: emptyMonthValues() },
      };
    });

  const removeSku = (id) =>
    setForm(f => {
      const newProd = { ...f.productionMonthsBySku };
      const newSales = { ...f.salesMonthsBySku };
      const newProdDates = { ...f.productionStartDateBySku };
      const newSalesDates = { ...f.salesStartDateBySku };
      const newMavDates = { ...f.mavDates };
      const newSolDates = { ...f.solDates };
      delete newProd[id];
      delete newSales[id];
      delete newProdDates[id];
      delete newSalesDates[id];
      delete newMavDates[id];
      delete newSolDates[id];
      return {
        ...f,
        skus: f.skus.filter(s => s.id !== id),
        productionMonthsBySku: newProd,
        salesMonthsBySku: newSales,
        productionStartDateBySku: newProdDates,
        salesStartDateBySku: newSalesDates,
        mavDates: newMavDates,
        solDates: newSolDates,
      };
    });

  const updateSku = (id, field, value) =>
    setForm(f => ({ ...f, skus: f.skus.map(s => s.id === id ? { ...s, [field]: value } : s) }));

  const toggleSkuCountry = (id, code) =>
    setForm(f => ({
      ...f,
      skus: f.skus.map(s => {
        if (s.id !== id) return s;
        const already = s.countries.includes(code);
        return { ...s, countries: already ? s.countries.filter(c => c !== code) : [...s.countries, code] };
      })
    }));

  const updateSku_value = (id, value) => updateSku(id, "value", value);

  // ─── CountryDropdown ────────────────────────────────────────────────────────
  function CountryDropdown({ skuId, selected }) {
    const isOpen = openDropdown === skuId;
    const allSelected = selected.length === COUNTRIES.length;

    const toggleAll = () => {
      const codes = allSelected ? [] : COUNTRIES.map(c => c.code);
      setForm(f => ({
        ...f,
        skus: f.skus.map(s => s.id === skuId ? { ...s, countries: codes } : s)
      }));
    };

    return (
      <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : skuId)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 10px", height: 36, whiteSpace: "nowrap",
            fontSize: 12, minWidth: 120,
            background: selected.length > 0 ? "var(--color-background-info)" : undefined,
            color: selected.length > 0 ? "var(--color-text-info)" : undefined,
            borderColor: selected.length > 0 ? "var(--color-border-info)" : undefined,
          }}
          title="Selecionar países"
        >
          <i className="ti ti-flag" aria-hidden="true" style={{ fontSize: 14 }}></i>
          {selected.length === 0
            ? "País"
            : selected.length === COUNTRIES.length
              ? "Todos os países"
              : `${selected.length} país${selected.length > 1 ? "es" : ""}`}
          <i className={`ti ti-chevron-${isOpen ? "up" : "down"}`} aria-hidden="true" style={{ fontSize: 12, marginLeft: "auto" }}></i>
        </button>

        {isOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100,
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            minWidth: 220, maxHeight: 280, overflowY: "auto",
            padding: "6px 0"
          }}>
            {/* Select all */}
            <div
              onClick={toggleAll}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                marginBottom: 4,
                color: allSelected ? "var(--color-text-info)" : "var(--color-text-secondary)"
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4,
                border: "1.5px solid", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderColor: allSelected ? "var(--color-border-info)" : "var(--color-border-tertiary)",
                background: allSelected ? "var(--color-background-info)" : "transparent"
              }}>
                {allSelected && <i className="ti ti-check" style={{ fontSize: 10, color: "var(--color-text-info)" }} aria-hidden="true"></i>}
              </div>
              Todos os países
            </div>

            {COUNTRIES.map(c => {
              const checked = selected.includes(c.code);
              return (
                <div
                  key={c.code}
                  onClick={() => toggleSkuCountry(skuId, c.code)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 14px", cursor: "pointer", fontSize: 13,
                    background: checked ? "var(--color-background-info)" : "transparent",
                    transition: "background 0.1s"
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4,
                    border: "1.5px solid", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderColor: checked ? "var(--color-border-info)" : "var(--color-border-tertiary)",
                    background: checked ? "var(--color-background-info)" : "transparent"
                  }}>
                    {checked && <i className="ti ti-check" style={{ fontSize: 10, color: "var(--color-text-info)" }} aria-hidden="true"></i>}
                  </div>
                  {c.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  const canNext = () => {
    if (step === 0) return form.projectName.trim().length > 0;
    if (step === 1) {
      const filledSkus = form.skus.filter(s => s.value.trim());
      if (!filledSkus.length) return false;
      return filledSkus.every(s => s.countries && s.countries.length > 0);
    }
    if (step === 2) {
      const validSkus = form.skus.filter(s => s.value.trim());
      return validSkus.every(s => form.productionStartDateBySku[s.id]);
    }
    if (step === 3) {
      const validSkus = form.skus.filter(s => s.value.trim());
      return validSkus.every(s => form.salesStartDateBySku[s.id]);
    }
    if (step === 4) return form.om1Target !== "";
    if (step === 5) return true; // Datas MAV/SOL são opcionais
    return true;
  };

  const getActiveSkuId = (activeId, type) => {
    const validSkus = form.skus.filter(s => s.value.trim());
    if (!validSkus.length) return null;
    if (activeId && validSkus.some(s => s.id === activeId)) return activeId;
    return validSkus[0].id;
  };

  const handleSubmit = async () => {
    const project = { ...form, id: Date.now() };
    setSaving(true);
    setSaveError(false);

    const rows = [];
    const validSkus = project.skus.filter(s => s.value.trim());
    const skusToProcess = validSkus.length > 0 ? validSkus : [{ id: "__default__", value: "", countries: [] }];

    skusToProcess.forEach(sku => {
      const prodMonths = project.productionMonthsBySku[sku.id] || emptyMonthValues();
      const salesMonths = project.salesMonthsBySku[sku.id] || emptyMonthValues();
      const prodStartDate = (project.productionStartDateBySku && project.productionStartDateBySku[sku.id]) || "";
      const salesStartDate = (project.salesStartDateBySku && project.salesStartDateBySku[sku.id]) || "";
      
      // Unpivot a nível de País: itera sobre cada país do SKU para gravar linhas individualizadas
      const countriesToProcess = sku.countries && sku.countries.length > 0 ? sku.countries : ["N/A"];

      countriesToProcess.forEach(countryCode => {
        const mavDateStr = project.mavDates?.[sku.id]?.[countryCode] || "";
        const solDateStr = project.solDates?.[sku.id]?.[countryCode] || "";

        for (let i = 0; i < 12; i++) {
          rows.push([
            project.projectName,
            sku.value,
            formatMonthYear(prodStartDate, i),
            prodMonths[i] ? Number(prodMonths[i]) : 0,
            formatMonthYear(salesStartDate, i),
            salesMonths[i] ? Number(salesMonths[i]) : 0,
            project.om1Target ? Number(project.om1Target) / 100 : "",
            new Date().toLocaleDateString("pt-BR"),
            countryCode,
            mavDateStr,
            solDateStr,
          ]);
        }
      });
    });

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({ rows }),
      });
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setSaveError(true);
    }

    setSaving(false);
    setAllProjects(p => [...p, project]);
    setSubmitted(true);
  };

  const handleNewProject = () => {
    setForm(createInitialState());
    setStep(0);
    setSubmitted(false);
    setActiveProdSkuId(null);
    setActiveSalesSkuId(null);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(allProjects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projetos_dashboard.json";
    a.click();
  };

  const exportXLSX = () => {
    const activeXLSX = typeof XLSX !== 'undefined' ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null);
    
    if (!activeXLSX) {
      alert("A biblioteca SheetJS (XLSX) não foi encontrada no ambiente. Certifique-se de que ela está carregada.");
      return;
    }

    const rows = [];
    
    rows.push([
      "Project Execution",
      "SKU",
      "Mês Referência",
      "Plano de Produção",
      "Produção Real",
      "Mês Referência",
      "Venda Planejada",
      "Venda Real",
      "OM1% Target",
      "País",
      "Data MAV Planejada",
      "Data SOL Planejada",
    ]);

    allProjects.forEach(p => {
      const validSkus = p.skus.filter(s => s.value.trim() !== "");
      const skusToProcess = validSkus.length > 0 ? validSkus : [{ id: "__default__", value: "", countries: [] }];

      skusToProcess.forEach(sku => {
        const prodMonths = p.productionMonthsBySku?.[sku.id] || emptyMonthValues();
        const salesMonths = p.salesMonthsBySku?.[sku.id] || emptyMonthValues();
        const prodStartDate = (p.productionStartDateBySku && p.productionStartDateBySku[sku.id]) || "";
        const salesStartDate = (p.salesStartDateBySku && p.salesStartDateBySku[sku.id]) || "";
        
        const countriesToProcess = sku.countries && sku.countries.length > 0 ? sku.countries : ["N/A"];

        countriesToProcess.forEach(countryCode => {
          const mavDateStr = p.mavDates?.[sku.id]?.[countryCode] || "";
          const solDateStr = p.solDates?.[sku.id]?.[countryCode] || "";

          for (let i = 0; i < 12; i++) {
            const prodMonth = formatMonthYear(prodStartDate, i);
            const prodVol = prodMonths[i] ? Number(prodMonths[i]) : 0;
            
            const salesMonth = formatMonthYear(salesStartDate, i);
            const salesVol = salesMonths[i] ? Number(salesMonths[i]) : 0;

            if (prodMonth || salesMonth) {
              rows.push([
                p.projectName,
                sku.value,
                prodMonth,
                prodVol,
                "", 
                salesMonth,
                salesVol,
                "", 
                p.om1Target ? Number(p.om1Target) / 100 : "", 
                countryCode,
                mavDateStr,
                solDateStr,
              ]);
            }
          }
        });
      });
    });

    const ws = activeXLSX.utils.aoa_to_sheet(rows);

    if (ws['!ref']) {
      const fullRange = activeXLSX.utils.decode_range(ws['!ref']);
      const mesColumns = [2, 5];
      for (let row = fullRange.s.r + 1; row <= fullRange.e.r; row++) {
        mesColumns.forEach(col => {
          const cellRef = activeXLSX.utils.encode_cell({ r: row, c: col });
          if (ws[cellRef]) {
            ws[cellRef].t = 's'; 
            ws[cellRef].z = '@'; 
          }
        });
      }
    }

    if (ws['!ref']) {
      const range = activeXLSX.utils.decode_range(ws['!ref']);
      
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const cellRef = activeXLSX.utils.encode_cell({ r: row, c: 8 });
        if (ws[cellRef] && ws[cellRef].v !== "") {
          ws[cellRef].t = 'n'; 
          ws[cellRef].z = '0.0%'; 
        }
      }

      const maxCols = range.e.c - range.s.c + 1;
      ws['!cols'] = Array(maxCols).fill(null).map((_, colIdx) => {
        let maxLen = 10; 
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellRef = activeXLSX.utils.encode_cell({ r: row, c: colIdx });
          if (ws[cellRef] && ws[cellRef].v) {
            const cellText = ws[cellRef].z === '0.0%' ? `${(ws[cellRef].v * 100).toFixed(1)}%` : String(ws[cellRef].v);
            if (cellText.length > maxLen) {
              maxLen = cellText.length;
            }
          }
        }
        return { wch: maxLen + 3 }; 
      });
    }

    const wb = activeXLSX.utils.book_new();
    activeXLSX.utils.book_append_sheet(wb, ws, "Projetos");
    activeXLSX.writeFile(wb, "projetos_dashboard_unpivot.xlsx");
  };

  if (submitted) {
    return (
      <div style={{ padding: "2rem 1rem", maxWidth: 640, margin: "0 auto" }}>
        <div style={{
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-lg)",
          padding: "2rem",
          textAlign: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--color-background-success)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <i className="ti ti-check" style={{ fontSize: 28, color: "var(--color-text-success)" }} aria-hidden="true"></i>
          </div>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: 18, fontWeight: 500 }}>Projeto salvo com sucesso</h2>
          <p style={{ color: "var(--color-text-secondary)", margin: "0 0 1.5rem", fontSize: 14 }}>
            <strong style={{ fontWeight: 500 }}>{form.projectName}</strong> foi salvo e enviado para a base de dados.
          </p>
          {saveError && (
            <div style={{
              background: "#fce8e6", color: "#c5221f", borderRadius: "var(--border-radius-md)",
              padding: "10px 14px", fontSize: 13, marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: 8, textAlign: "left"
            }}>
              <i className="ti ti-alert-circle" aria-hidden="true"></i>
              <span>Não foi possível salvar na base de dados. Verifique a URL do Apps Script.</span>
            </div>
          )}
          {!saveError && (
            <div style={{
              background: "var(--color-background-info)", color: "var(--color-text-info)", borderRadius: "var(--border-radius-md)",
              padding: "10px 14px", fontSize: 13, marginBottom: "1.5rem",
              display: "flex", alignItems: "center", gap: 8, textAlign: "left"
            }}>
              <i className="ti ti-table" aria-hidden="true"></i>
              <span>Os dados foram salvos com sucesso.</span>
            </div>
          )}
          <button type="button" onClick={handleNewProject} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="ti ti-plus" aria-hidden="true"></i> Novo projeto
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 1rem", maxWidth: 640, margin: "0 auto" }}
      onClick={() => setOpenDropdown(null)}
    >
      <h2 style={{ margin: "0 0 0.25rem", fontSize: 18, fontWeight: 500 }}>
        Cadastro de Projeto — Dashboard
      </h2>
      <p style={{ margin: "0 0 1.5rem", fontSize: 13, color: "var(--color-text-secondary)" }}>
        Preencha os dados do projeto para alimentar o dashboard.
      </p>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem", gap: 0 }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 500,
                background: i < step ? "var(--color-background-success)" :
                  i === step ? "var(--color-background-info)" : "var(--color-background-secondary)",
                color: i < step ? "var(--color-text-success)" :
                  i === step ? "var(--color-text-info)" : "var(--color-text-tertiary)",
                border: i === step ? "1.5px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                cursor: i < step ? "pointer" : "default",
                transition: "all 0.2s"
              }} onClick={() => i < step && setStep(i)}>
                {i < step ? <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true"></i> : i + 1}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: i === step ? "var(--color-text-info)" : "var(--color-text-tertiary)",
                whiteSpace: "nowrap"
              }}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{
                flex: 1, height: 1, marginBottom: 18,
                background: i < step ? "var(--color-border-success)" : "var(--color-border-tertiary)"
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.5rem",
        marginBottom: "1rem"
      }}>

        {/* STEP 0: Project name */}
        {step === 0 && (
          <div>
            <label style={labelStyle}>Nome do projeto</label>
            <input
              type="text"
              value={form.projectName}
              onChange={e => update("projectName", e.target.value)}
              placeholder="Ex: GWS 9-125 S"
              style={{ width: "100%", boxSizing: "border-box" }}
              autoFocus
            />
            <p style={hintStyle}>Nome completo do projeto conforme aparece no dashboard.</p>
          </div>
        )}

        {/* STEP 1: SKUs */}
        {step === 1 && (() => {
          const filledSkus = form.skus.filter(s => s.value.trim());
          const skusWithoutCountry = filledSkus.filter(s => !s.countries || s.countries.length === 0);
          return (
          <div>
            <label style={labelStyle}>SKUs do projeto</label>
            <p style={hintStyle}>Adicione todos os códigos de SKU relacionados a este projeto.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {form.skus.map((sku, i) => (
                <div key={sku.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={sku.value}
                    onChange={e => updateSku_value(sku.id, e.target.value)}
                    placeholder={`SKU ${i + 1} — ex: 0601.9N4.3E1`}
                    style={{ flex: 1 }}
                    autoFocus={i === form.skus.length - 1 && i > 0}
                  />
                  <CountryDropdown skuId={sku.id} selected={sku.countries || []} />
                  {form.skus.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSku(sku.id)}
                      style={{ padding: "0 10px", color: "var(--color-text-danger)" }}
                      aria-label="Remover SKU"
                    >
                      <i className="ti ti-trash" aria-hidden="true"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addSku} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <i className="ti ti-plus" aria-hidden="true"></i> Adicionar SKU
            </button>
            {skusWithoutCountry.length > 0 && filledSkus.length > 0 && (
              <div style={{
                marginTop: 14,
                background: "var(--color-background-warning, #fff8e1)",
                border: "0.5px solid var(--color-border-warning, #f9a825)",
                borderRadius: "var(--border-radius-md)",
                padding: "10px 14px",
                fontSize: 12,
                color: "var(--color-text-warning, #b45309)",
                display: "flex", alignItems: "flex-start", gap: 8
              }}>
                <i className="ti ti-alert-triangle" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}></i>
                <span>
                  {skusWithoutCountry.length === 1
                    ? `O SKU <strong>${skusWithoutCountry[0].value}</strong> precisa ter pelo menos um país selecionado para avançar.`
                    : `Os SKUs <strong>${skusWithoutCountry.map(s => s.value).join(", ")}</strong> precisam ter pelo menos um país selecionado para avançar.`
                  }
                </span>
              </div>
            )}
          </div>
          );
        })()}

        {/* STEP 2: Production plan */}
        {step === 2 && (() => {
          const validSkus = form.skus.filter(s => s.value.trim());
          const currentSkuId = getActiveSkuId(activeProdSkuId, "prod");
          const currentMonths = (currentSkuId && form.productionMonthsBySku[currentSkuId])
            ? form.productionMonthsBySku[currentSkuId]
            : emptyMonthValues();
          const currentStartDate = currentSkuId ? (form.productionStartDateBySku[currentSkuId] || "") : "";

          return (
            <div>
              <label style={labelStyle}>Plano de produção — 12 meses</label>

              {/* Tabs de SKU */}
              {validSkus.length > 1 && (
                <div style={{
                  display: "flex", gap: 6, flexWrap: "wrap",
                  marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 10
                }}>
                  {validSkus.map(sku => {
                    const isActive = sku.id === currentSkuId;
                    const hasDate = !!(form.productionStartDateBySku[sku.id]);
                    return (
                      <button
                        key={sku.id}
                        type="button"
                        onClick={() => setActiveProdSkuId(sku.id)}
                        style={{
                          fontSize: 12, padding: "4px 12px", borderRadius: "var(--border-radius-md)",
                          fontWeight: isActive ? 600 : 400,
                          background: isActive ? "var(--color-background-info)" : "var(--color-background-secondary)",
                          color: isActive ? "var(--color-text-info)" : "var(--color-text-secondary)",
                          borderColor: isActive ? "var(--color-border-info)" : hasDate ? "var(--color-border-success)" : "var(--color-border-tertiary)",
                        }}
                      >
                        {sku.value}
                        {!hasDate && <span style={{ marginLeft: 4, color: "var(--color-text-danger)", fontSize: 10 }}>●</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {validSkus.length === 1 && (
                <div style={{
                  fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)",
                  marginBottom: 12, padding: "4px 10px",
                  background: "var(--color-background-secondary)",
                  borderRadius: "var(--border-radius-md)", display: "inline-block"
                }}>
                  SKU: {validSkus[0].value}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ ...labelStyle, fontSize: 12 }}>
                  Mês de início da produção
                  {validSkus.length > 1 && currentSkuId && (
                    <span style={{ color: "var(--color-text-info)", marginLeft: 6 }}>
                      — {validSkus.find(s => s.id === currentSkuId)?.value}
                    </span>
                  )}
                </label>
                <input
                  type="month"
                  value={currentStartDate}
                  onChange={e => updateStartDateBySku("prod", currentSkuId, e.target.value)}
                  style={{ width: "auto" }}
                />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 10
              }}>
                {currentMonths.map((val, i) => (
                  <div key={i}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, fontWeight: 500 }}>
                      {getMonthLabel(currentStartDate, i)}
                    </label>
                    <input
                      type="number"
                      min=""
                      value={val}
                      onChange={e => updateMonthVal("prod", currentSkuId, i, e.target.value)}
                      placeholder=""
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>
              <p style={hintStyle}>Volume planejado de produção por mês (unidades), por SKU.</p>
            </div>
          );
        })()}

        {/* STEP 3: Sales plan */}
        {step === 3 && (() => {
          const validSkus = form.skus.filter(s => s.value.trim());
          const currentSkuId = getActiveSkuId(activeSalesSkuId, "sales");
          const currentMonths = (currentSkuId && form.salesMonthsBySku[currentSkuId])
            ? form.salesMonthsBySku[currentSkuId]
            : emptyMonthValues();
          const currentStartDate = currentSkuId ? (form.salesStartDateBySku[currentSkuId] || "") : "";

          return (
            <div>
              <label style={labelStyle}>Plano de vendas — 12 meses</label>

              {/* Tabs de SKU */}
              {validSkus.length > 1 && (
                <div style={{
                  display: "flex", gap: 6, flexWrap: "wrap",
                  marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: 10
                }}>
                  {validSkus.map(sku => {
                    const isActive = sku.id === currentSkuId;
                    const hasDate = !!(form.salesStartDateBySku[sku.id]);
                    return (
                      <button
                        key={sku.id}
                        type="button"
                        onClick={() => setActiveSalesSkuId(sku.id)}
                        style={{
                          fontSize: 12, padding: "4px 12px", borderRadius: "var(--border-radius-md)",
                          fontWeight: isActive ? 600 : 400,
                          background: isActive ? "var(--color-background-info)" : "var(--color-background-secondary)",
                          color: isActive ? "var(--color-text-info)" : "var(--color-text-secondary)",
                          borderColor: isActive ? "var(--color-border-info)" : hasDate ? "var(--color-border-success)" : "var(--color-border-tertiary)",
                        }}
                      >
                        {sku.value}
                        {!hasDate && <span style={{ marginLeft: 4, color: "var(--color-text-danger)", fontSize: 10 }}>●</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {validSkus.length === 1 && (
                <div style={{
                  fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)",
                  marginBottom: 12, padding: "4px 10px",
                  background: "var(--color-background-secondary)",
                  borderRadius: "var(--border-radius-md)", display: "inline-block"
                }}>
                  SKU: {validSkus[0].value}
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ ...labelStyle, fontSize: 12 }}>
                  Mês de início das vendas
                  {validSkus.length > 1 && currentSkuId && (
                    <span style={{ color: "var(--color-text-info)", marginLeft: 6 }}>
                      — {validSkus.find(s => s.id === currentSkuId)?.value}
                    </span>
                  )}
                </label>
                <input
                  type="month"
                  value={currentStartDate}
                  onChange={e => updateStartDateBySku("sales", currentSkuId, e.target.value)}
                  style={{ width: "auto" }}
                />
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 10
              }}>
                {currentMonths.map((val, i) => (
                  <div key={i}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4, fontWeight: 500 }}>
                      {getMonthLabel(currentStartDate, i)}
                    </label>
                    <input
                      type="number"
                      min=""
                      value={val}
                      onChange={e => updateMonthVal("sales", currentSkuId, i, e.target.value)}
                      placeholder=""
                      style={{ width: "100%", boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>
              <p style={hintStyle}>Volume planejado de vendas por mês (unidades), por SKU.</p>
            </div>
          );
        })()}

        {/* STEP 4: OM1 Target */}
        {step === 4 && (
          <div>
            <label style={labelStyle}>OM1% Target</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.om1Target}
                onChange={e => update("om1Target", e.target.value)}
                placeholder="Ex: 39.2"
                style={{ width: 160 }}
                autoFocus
              />
              <span style={{ fontSize: 16, color: "var(--color-text-secondary)" }}>%</span>
            </div>
            {form.om1Target !== "" && (
              <div style={{
                display: "inline-block",
                background: "var(--color-background-info)",
                color: "var(--text-info)",
                borderRadius: "var(--border-radius-md)",
                padding: "4px 12px",
                fontSize: 13,
                fontWeight: 500,
                marginTop: 4
              }}>
                {parseFloat(form.om1Target).toFixed(1)}% de target
              </div>
            )}
            <p style={hintStyle}>Indicador OM1% target do projeto. Valor percentual (ex: 39.2 para 39,2%).</p>
          </div>
        )}

        {/* STEP 5: Datas MAV e SOL individuais por SKU e País */}
        {step === 5 && (() => {
          const validSkus = form.skus.filter(s => s.value.trim());

          if (validSkus.length === 0 || validSkus.every(s => !s.countries || s.countries.length === 0)) {
            return (
              <div>
                <label style={labelStyle}>Datas planejadas</label>
                <p style={hintStyle}>Você precisa adicionar SKUs e selecionar os países no Passo 2 antes de definir as datas.</p>
              </div>
            );
          }

          return (
            <div>
              <label style={labelStyle}>Datas planejadas (MAV / SOL por País)</label>
              <p style={hintStyle}>Informe as datas planejadas de MAV e SOL para cada país em cada SKU. (Opcional)</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 16 }}>
                {validSkus.map(sku => {
                  if (!sku.countries || sku.countries.length === 0) return null;

                  return (
                    <div key={sku.id} style={{
                      background: "var(--color-background-secondary)",
                      borderRadius: "var(--border-radius-lg)",
                      padding: "1.25rem",
                      border: "0.5px solid var(--color-border-tertiary)"
                    }}>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: 14, color: "var(--color-text-primary)", fontWeight: 600 }}>
                        SKU: {sku.value}
                      </h4>

                      {/* Tabela Simplificada */}
                      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 12, marginBottom: 8, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>
                        <div>País</div>
                        <div>Data MAV</div>
                        <div>Data SOL</div>
                      </div>

                      {sku.countries.map(code => {
                        const countryObj = COUNTRIES.find(c => c.code === code);
                        const countryLabel = countryObj ? countryObj.label : code;
                        const mavVal = form.mavDates?.[sku.id]?.[code] || "";
                        const solVal = form.solDates?.[sku.id]?.[code] || "";

                        return (
                          <div key={code} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 12, alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                              {countryLabel}
                            </div>
                            <input
                              type="month"
                              value={mavVal}
                              onChange={e => updateCountryDate("mav", sku.id, code, e.target.value)}
                              style={{ width: "100%", fontSize: 12, padding: "6px" }}
                            />
                            <input
                              type="month"
                              value={solVal}
                              onChange={e => updateCountryDate("sol", sku.id, code, e.target.value)}
                              style={{ width: "100%", fontSize: 12, padding: "6px" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* STEP 6: Review */}
        {step === 6 && (
          <div>
            <h3 style={{ margin: "0 0 1rem", fontSize: 15, fontWeight: 500 }}>Revisão dos dados</h3>

            <ReviewRow label="Projeto" value={form.projectName} />
            <ReviewRow label="SKUs" value={
              form.skus.filter(s => s.value).map(s =>
                s.countries && s.countries.length > 0
                  ? `${s.value} (${s.countries.join(", ")})`
                  : s.value
              ).join(", ")
            } />
            
            {form.skus.filter(s => s.value.trim()).map(sku => {
              const prodMonths = form.productionMonthsBySku[sku.id] || emptyMonthValues();
              const prodStartDate = (form.productionStartDateBySku && form.productionStartDateBySku[sku.id]) || "";
              return (
                <div key={sku.id} style={{ marginBottom: 12 }}>
                  <span style={reviewLabelStyle}>
                    Produção — {sku.value}
                    {prodStartDate && <span style={{ fontWeight: 400, marginLeft: 6 }}>({prodStartDate})</span>}
                  </span>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginTop: 4
                  }}>
                    {prodMonths.map((v, i) => (
                      <div key={i} style={{
                        background: "var(--color-background-secondary)",
                        borderRadius: "var(--border-radius-md)",
                        padding: "4px 6px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{getMonthLabel(prodStartDate, i)}</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            {form.skus.filter(s => s.value.trim()).map(sku => {
              const salesMonths = form.salesMonthsBySku[sku.id] || emptyMonthValues();
              const salesStartDate = (form.salesStartDateBySku && form.salesStartDateBySku[sku.id]) || "";
              return (
                <div key={sku.id} style={{ marginBottom: 12 }}>
                  <span style={reviewLabelStyle}>
                    Vendas — {sku.value}
                    {salesStartDate && <span style={{ fontWeight: 400, marginLeft: 6 }}>({salesStartDate})</span>}
                  </span>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginTop: 4
                  }}>
                    {salesMonths.map((v, i) => (
                      <div key={i} style={{
                        background: "var(--color-background-secondary)",
                        borderRadius: "var(--border-radius-md)",
                        padding: "4px 6px",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-tertiary)" }}>{getMonthLabel(salesStartDate, i)}</div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{v || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            
            <ReviewRow label="OM1% Target" value={`${parseFloat(form.om1Target || 0).toFixed(1)}%`} />
            
            {/* Listagem detalhada das Datas por SKU/País na Revisão */}
            <div style={{ marginTop: 16 }}>
              <span style={reviewLabelStyle}>Prazos de MAV / SOL por País</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {form.skus.filter(s => s.value.trim()).map(sku => (
                  <div key={sku.id} style={{ background: "var(--color-background-secondary)", padding: "8px 12px", borderRadius: "var(--border-radius-md)" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>SKU: {sku.value}</div>
                    {(sku.countries || []).map(code => {
                      const countryObj = COUNTRIES.find(c => c.code === code);
                      const countryLabel = countryObj ? countryObj.label : code;
                      
                      const mav = form.mavDates?.[sku.id]?.[code];
                      const sol = form.solDates?.[sku.id]?.[code];
                      
                      const format = (d) => {
                        if (!d) return "—";
                        const [y, m] = d.split("-");
                        return `${MONTH_NAMES[parseInt(m, 10) - 1]}/${String(y).slice(2)}`;
                      };

                      return (
                        <div key={code} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "2px 0", color: "var(--color-text-secondary)" }}>
                          <span>{countryLabel}</span>
                          <span>MAV: {format(mav)} | SOL: {format(sol)}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          style={{ opacity: step === 0 ? 0.3 : 1, display: "flex", alignItems: "center", gap: 6 }}
        >
          <i className="ti ti-arrow-left" aria-hidden="true"></i> Voltar
        </button>

        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
          {step + 1} / {STEPS.length}
        </span>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
            style={{ display: "flex", alignItems: "center", gap: 6, opacity: canNext() ? 1 : 0.35 }}
          >
            Próximo <i className="ti ti-arrow-right" aria-hidden="true"></i>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: saving ? "var(--color-background-secondary)" : "var(--color-background-success)",
              color: saving ? "var(--color-text-tertiary)" : "var(--color-text-success)",
              borderColor: saving ? "var(--color-border-tertiary)" : "var(--color-border-success)",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? <><i className="ti ti-loader-2" aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}></i> Salvando...</>
              : <><i className="ti ti-check" aria-hidden="true"></i> Salvar projeto</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 8,
  color: "var(--color-text-primary)"
};

const hintStyle = {
  fontSize: 12,
  color: "var(--color-text-tertiary)",
  marginTop: 8,
  marginBottom: 0
};

const reviewLabelStyle = {
  fontSize: 12,
  color: "var(--color-text-secondary)",
  fontWeight: 500,
};

// Componente simples para linhas de revisão estáticas
function ReviewRow({ label, value }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "8px 0",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      marginBottom: 4,
      gap: 12
    }}>
      <span style={{ fontSize: 13, color: "var(--color-text-secondary)", minWidth: 120 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ProjectDataCollector />);