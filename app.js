const { useState } = React;

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
  { code: "PY", label: "🇵🇾 Paraguai" },
  { code: "EC", label: "🇪🇨 Ecuador" },
  { code: "UY", label: "🇺🇾 Uruguai" },
  { code: "PE", label: "🇵🇪 Peru" },
  { code: "BO", label: "🇧🇴 Bolivia" },
  { code: "CR", label: "🇨🇷 Costa Rica" }
];

const VERSION_TYPES = [
  "Solo (Cordless)", "Basica (Corded)", "Basica + AC (Corded)",
  "Kit 1Bat", "Kit 2Bat", "Kit 1Bat + AC", "Kit 2Bat + AC"
];

const PACKAGING_TYPES = [
  "Carton box standard", "Carton box L-Boxx-ready", "Standard case",
  "Standard case w/sleeve", "L-Case", "L-Case w/sleeve"
];

// ── Bosch palette ──────────────────────────────────────────────
const B = {
  red:        "#a81212",
  redDark:    "#b8000f",
  dark:       "#000000",
  darkMid:    "#202020",
  blue:       "#0b6bac",
  blueBg:     "#262f36",
  blueBorder: "#0c6baa",
  bg:         "#ffffff",
  bgGray:     "#2c4c5f",
  bgDark:     "#412c2c",
  border:     "#dddddd",
  textPri:    "#000000",
  textSec:    "#ffffff",
  textTer:    "#fffbfb",
  textGreen:  "#137333",
  bgGreen:    "#59c577",
  borderGreen:"#137333",
};

// ── Shared style tokens ────────────────────────────────────────
const labelStyle = {
  display: "block", fontSize: 13, fontWeight: 600,
  marginBottom: 8, color: B.textPri, letterSpacing: "0.01em"
};
const hintStyle = {
  fontSize: 12, color: B.textPri, marginTop: 6, marginBottom: 0
};
const reviewLabelStyle = {
  fontSize: 12, color: B.textPri, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em"
};

const inputBase = {
  padding: "9px 12px",
  border: `1px solid ${B.border}`,
  borderRadius: 3,
  fontSize: 14,
  color: B.textPri,
  backgroundColor: B.bg,
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.15s",
};

const btnBase = {
  padding: "9px 18px",
  border: `1.5px solid ${B.border}`,
  borderRadius: 3,
  backgroundColor: B.bg,
  color: B.textPri,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "all 0.15s",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const btnPrimary = {
  ...btnBase,
  backgroundColor: B.red,
  color: "#fff",
  borderColor: B.red,
};

const btnGhost = {
  ...btnBase,
  backgroundColor: "transparent",
  border: "none",
  padding: "6px 10px",
};

// ── Helpers ────────────────────────────────────────────────────


function maskSku(raw) {
  const chars = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10); // remove tudo que não for letra/número
  let masked = chars.slice(0, 4);
  if (chars.length > 4) masked += "." + chars.slice(4, 7);
  if (chars.length > 7) masked += "." + chars.slice(7, 10);
  return masked;
}

function isSkuComplete(value) {
  return /^[A-Za-z0-9]{4}\.[A-Za-z0-9]{3}\.[A-Za-z0-9]{3}$/.test(value);
}

function getMonthLabel(startDate, idx) {
  if (!startDate) return MONTHS_LABELS[idx];
  const [year, month] = startDate.split("-").map(Number);
  const d = new Date(year, month - 1 + idx, 15);
  return `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

function formatMonthYear(startDate, idx) {
  if (!startDate) return "";
  const [year, month] = startDate.split("-").map(Number);
  const d = new Date(year, month - 1 + idx, 15);
  const monthsPt = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${monthsPt[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

const emptyMonthValues = () => Array(12).fill("");

function parseExcelPaste(text) {
  if (!text || !text.trim()) return null;
  const cleaned = text.trim();
  let parts;
  if (cleaned.includes("\t"))      parts = cleaned.split("\t");
  else if (cleaned.includes(";"))  parts = cleaned.split(";");
  else if (cleaned.includes(","))  parts = cleaned.split(",");
  else return null;
  const values = parts.map(p => p.trim().replace(/\./g, "").replace(",", "."));
  return values.length >= 2 ? values : null;
}

function createInitialState() {
  const firstVersionId = Date.now();
  const firstSkuId = Date.now() + 1;
  return {
    projectName: "",
    versions: [{ id: firstVersionId, type: "", packaging: "" }],
    skus: [{ id: firstSkuId, versionId: firstVersionId, value: "", countries: [] }],
    productionStartDateBySku: { [firstSkuId]: "" },
    productionMonthsBySku: { [firstSkuId]: emptyMonthValues() },
    salesStartDateBySku: { [firstSkuId]: "" },
    salesMonthsBySku: { [firstSkuId]: emptyMonthValues() },
    om1Target: "",
    ruqTarget: "",
    mavDates: {},
    solDates: {},
  };
}

const STEPS = ["Projeto", "Versões", "SKUs", "Produção", "Vendas", "OM1 Target", "RuQ Target", "Datas", "Revisão"];

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwc2yACEAkMD5T4XOWLtutiHaPDPEwDFa8K8cMfTOyWmIkQmchepOmM7NxmAArORjJX/exec";

// ── Bosch Logo SVG ─────────────────────────────────────────────
function BoschLogo({ height = 22 }) {
  return (
    <svg height={height} viewBox="0 0 140 46" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="140" height="46" rx="23" fill="white"/>
      <text
        x="70" y="31"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="26"
        fill={B.red}
        letterSpacing="1"
      >BOSCH</text>
    </svg>
  );
}

// ── ReviewRow ──────────────────────────────────────────────────
function ReviewRow({ label, value }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "9px 0", borderBottom: `1px solid ${B.border}`, gap: 12
    }}>
      <span style={{ fontSize: 13, color: B.textPri, minWidth: 130 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right", wordBreak: "break-word", color: B.textPri }}>{value}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
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
  const [pasteSuccess, setPasteSuccess] = useState(null);
  const [expandedVersions, setExpandedVersions] = useState({});
  

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Version management ───────────────────────────────────────
  const addVersion = () => {
    const newVersionId = Date.now();
    const newSkuId = Date.now() + 1;
    setForm(f => ({
      ...f,
      versions: [...f.versions, { id: newVersionId, type: "", packaging: "" }],
      skus: [...f.skus, { id: newSkuId, versionId: newVersionId, value: "", countries: [] }],
      productionStartDateBySku: { ...f.productionStartDateBySku, [newSkuId]: "" },
      productionMonthsBySku: { ...f.productionMonthsBySku, [newSkuId]: emptyMonthValues() },
      salesStartDateBySku: { ...f.salesStartDateBySku, [newSkuId]: "" },
      salesMonthsBySku: { ...f.salesMonthsBySku, [newSkuId]: emptyMonthValues() },
    }));
  };

  const updateVersion = (id, field, value) =>
    setForm(f => ({ ...f, versions: f.versions.map(v => v.id === id ? { ...v, [field]: value } : v) }));

  const removeVersion = (versionId) => {
    setForm(f => {
      const skusToRemove = f.skus.filter(s => s.versionId === versionId).map(s => s.id);
      const newProd = { ...f.productionMonthsBySku };
      const newSales = { ...f.salesMonthsBySku };
      const newProdDates = { ...f.productionStartDateBySku };
      const newSalesDates = { ...f.salesStartDateBySku };
      const newMavDates = { ...f.mavDates };
      const newSolDates = { ...f.solDates };
      skusToRemove.forEach(id => {
        delete newProd[id]; delete newSales[id];
        delete newProdDates[id]; delete newSalesDates[id];
        delete newMavDates[id]; delete newSolDates[id];
      });
      return {
        ...f,
        versions: f.versions.filter(v => v.id !== versionId),
        skus: f.skus.filter(s => s.versionId !== versionId),
        productionMonthsBySku: newProd, salesMonthsBySku: newSales,
        productionStartDateBySku: newProdDates, salesStartDateBySku: newSalesDates,
        mavDates: newMavDates, solDates: newSolDates,
      };
    });
  };

  // ── SKU management ───────────────────────────────────────────
  const addSkuToVersion = (versionId) => {
    const newSku = { id: Date.now(), versionId, value: "", countries: [] };
    setForm(f => ({
      ...f,
      skus: [...f.skus, newSku],
      productionStartDateBySku: { ...f.productionStartDateBySku, [newSku.id]: "" },
      productionMonthsBySku: { ...f.productionMonthsBySku, [newSku.id]: emptyMonthValues() },
      salesStartDateBySku: { ...f.salesStartDateBySku, [newSku.id]: "" },
      salesMonthsBySku: { ...f.salesMonthsBySku, [newSku.id]: emptyMonthValues() },
    }));
  };

  const removeSku = (id) =>
    setForm(f => {
      const newProd = { ...f.productionMonthsBySku };
      const newSales = { ...f.salesMonthsBySku };
      const newProdDates = { ...f.productionStartDateBySku };
      const newSalesDates = { ...f.salesStartDateBySku };
      const newMavDates = { ...f.mavDates };
      const newSolDates = { ...f.solDates };
      delete newProd[id]; delete newSales[id];
      delete newProdDates[id]; delete newSalesDates[id];
      delete newMavDates[id]; delete newSolDates[id];
      return {
        ...f,
        skus: f.skus.filter(s => s.id !== id),
        productionMonthsBySku: newProd, salesMonthsBySku: newSales,
        productionStartDateBySku: newProdDates, salesStartDateBySku: newSalesDates,
        mavDates: newMavDates, solDates: newSolDates,
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

  const updateStartDateBySku = (type, skuId, value) => {
    const key = type === "prod" ? "productionStartDateBySku" : "salesStartDateBySku";
    setForm(f => ({ ...f, [key]: { ...f[key], [skuId]: value } }));
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

  const handleMonthPaste = (e, type, skuId, startIdx) => {
    const text = e.clipboardData.getData("text");
    const values = parseExcelPaste(text);
    if (!values) return;
    e.preventDefault();
    const key = type === "prod" ? "productionMonthsBySku" : "salesMonthsBySku";
    setForm(f => {
      const bySkuCopy = { ...f[key] };
      const arr = [...(bySkuCopy[skuId] || emptyMonthValues())];
      values.forEach((val, i) => {
        const targetIdx = startIdx + i;
        if (targetIdx < 12) {
          const num = val.replace(/[^\d.-]/g, "");
          arr[targetIdx] = num !== "" && !isNaN(Number(num)) ? num : arr[targetIdx];
        }
      });
      bySkuCopy[skuId] = arr;
      return { ...f, [key]: bySkuCopy };
    });
    setPasteSuccess({ type, skuId });
    setTimeout(() => setPasteSuccess(null), 2000);
  };

  const updateCountryDate = (type, skuId, countryCode, value) => {
    const key = type === "mav" ? "mavDates" : "solDates";
    setForm(f => {
      const skuDates = f[key][skuId] || {};
      return { ...f, [key]: { ...f[key], [skuId]: { ...skuDates, [countryCode]: value } } };
    });
  };
  

  // ── CountryDropdown ──────────────────────────────────────────
  function CountryDropdown({ skuId, selected }) {
    const isOpen = openDropdown === skuId;
    const allSelected = selected.length === COUNTRIES.length;

    const toggleAll = () => {
      const codes = allSelected ? [] : COUNTRIES.map(c => c.code);
      setForm(f => ({ ...f, skus: f.skus.map(s => s.id === skuId ? { ...s, countries: codes } : s) }));
    };

    const hasSelection = selected.length > 0;

    return (
      <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setOpenDropdown(isOpen ? null : skuId)}
          style={{
            ...btnBase,
            padding: "0 12px", height: 38, whiteSpace: "nowrap",
            fontSize: 12, minWidth: 130,
            backgroundColor: hasSelection ? B.textSec : B.bg,
            color: hasSelection ? B.blue : B.textPri,
            borderColor: hasSelection ? B.blue : B.border,
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
            background: B.textSec,
            border: `1px solid ${B.border}`,
            borderRadius: 4,
            boxShadow: "0 8px 24px rgba(219, 214, 214, 0.14)",
            minWidth: 220, maxHeight: 280, overflowY: "auto",
            padding: "6px 0"
          }}>
            <div
              onClick={toggleAll}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                borderBottom: `1px solid ${B.border}`, marginBottom: 4,
                color: allSelected ? B.blue : B.textSec
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 3,
                border: `1.5px solid ${allSelected ? B.textSec : B.border}`,
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: allSelected ? B.blueBg : "transparent"
              }}>
                {allSelected && <i className="ti ti-check" style={{ fontSize: 10, color: B.blue }} aria-hidden="true"></i>}
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
                    padding: "7px 14px", cursor: "pointer", fontSize: 13,
                    backgroundColor: checked ? B.textSec : "transparent",
                    transition: "background 0.1s"
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 3,
                    border: `1.5px solid ${checked ? B.blue : B.border}`,
                    flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: checked ? B.blueBg : "transparent"
                  }}>
                    {checked && <i className="ti ti-check" style={{ fontSize: 10, color: B.blue }} aria-hidden="true"></i>}
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

  // ── Validation ───────────────────────────────────────────────
  const canNext = () => {
    if (step === 0) return form.projectName.trim().length > 0;
    if (step === 1) return form.versions.length > 0 && form.versions.every(v => v.type && v.packaging);
    if (step === 2) {
  const filledSkus = form.skus.filter(s => s.value.trim());
  return filledSkus.length > 0 &&
    filledSkus.every(s => s.countries && s.countries.length > 0 && isSkuComplete(s.value));
}
    if (step === 3) return form.skus.filter(s => s.value.trim()).every(s => form.productionStartDateBySku[s.id]);
    if (step === 4) return form.skus.filter(s => s.value.trim()).every(s => form.salesStartDateBySku[s.id]);
    if (step === 5) return form.om1Target !== "";
    if (step === 6) return form.ruqTarget !== "";
    return true;
  };

  const getActiveSkuId = (activeId, type) => {
    const validSkus = form.skus.filter(s => s.value.trim());
    if (!validSkus.length) return null;
    if (activeId && validSkus.some(s => s.id === activeId)) return activeId;
    return validSkus[0].id;
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    const project = { ...form, id: Date.now() };
    setSaving(true);
    setSaveError(false);

    const rows = [];
    const validSkus = project.skus.filter(s => s.value.trim());
    const skusToProcess = validSkus.length > 0 ? validSkus : [{ id: "__default__", value: "", countries: [] }];

    skusToProcess.forEach(sku => {
      const versionData = project.versions.find(v => v.id === sku.versionId) || {};
      const prodMonths = project.productionMonthsBySku[sku.id] || emptyMonthValues();
      const salesMonths = project.salesMonthsBySku[sku.id] || emptyMonthValues();
      const prodStartDate = (project.productionStartDateBySku && project.productionStartDateBySku[sku.id]) || "";
      const salesStartDate = (project.salesStartDateBySku && project.salesStartDateBySku[sku.id]) || "";
      const countriesToProcess = sku.countries && sku.countries.length > 0 ? sku.countries : ["N/A"];

      countriesToProcess.forEach(countryCode => {
        const mavDateStr = project.mavDates?.[sku.id]?.[countryCode] || "";
        const solDateStr = project.solDates?.[sku.id]?.[countryCode] || "";
        for (let i = 0; i < 12; i++) {
          rows.push([
            project.projectName, sku.value,
            formatMonthYear(prodStartDate, i), prodMonths[i] ? Number(prodMonths[i]) : 0,
            formatMonthYear(salesStartDate, i), salesMonths[i] ? Number(salesMonths[i]) : 0,
            project.om1Target ? Number(project.om1Target) / 100 : "",
            project.ruqTarget ? Number(project.ruqTarget) / 100 : "",
            new Date().toLocaleDateString("pt-BR"),
            new Date().toLocaleDateString("pt-BR"),
            countryCode, mavDateStr, solDateStr,
            versionData.type || "", versionData.packaging || ""
          ]);
        }
      });
    });

    try {
      await fetch(APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify({ rows }) });
    } catch (err) {
      console.error("Erro ao salvar:", err);
      setSaveError(true);
      setSaving(false);
      return;
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

  // ── Success screen ───────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{
  minHeight: "100vh",
  backgroundImage: "url('https://us.bosch-press.com/pressportal/us/media/dam_images_us/pi231_usus/37170_bosch_lw3_family_final_1_img_w1600.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  paddingTop: 4,
  position: "relative",
  zIndex: 1
}}>
  <div style={{
    position: "fixed", inset: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 0
  }} />
        {/* Header */}
        <div style={{
  backgroundImage: "url('o05-a_18v-hub_1920x768.jpg')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  height: 52,
  display: "flex",
  alignItems: "center",
  padding: "0 24px",
  gap: 16,
  boxShadow: "0 2px 8px rgba(0,0,0,0.35)"
}}>
          <BoschLogo />
          <span style={{ color: "#ce3b3b", fontSize: 12, borderLeft: "1px solid #9e1a1a", paddingLeft: 16 }}>
            Cadastro de Projeto
          </span>
        </div>

        <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 1rem" }}>
          <div style={{
            backgroundColor: B.bg,
            borderRadius: 4,
            borderTop: `3px solid ${B.textGreen}`,
            boxShadow: "0 2px 12px rgba(0,0,0,0.09)",
            padding: "2.5rem 2rem",
            textAlign: "center",
            position: "relative",
            zIndex:1
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              backgroundColor: B.bgGreen,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
              border: `2px solid ${B.borderGreen}`
            }}>
              <i className="ti ti-check" style={{ fontSize: 28, color: B.textGreen }} aria-hidden="true"></i>
            </div>
            <h2 style={{ margin: "0 0 0.5rem", fontSize: 18, fontWeight: 700, color: B.textPri }}>
              Projeto salvo com sucesso
            </h2>
            <p style={{ color: B.textPri, margin: "0 0 1.5rem", fontSize: 14 }}>
              <strong style={{ fontWeight: 600 }}>{form.projectName}</strong> foi enviado para a base de dados.
            </p>

            {saveError && (
              <div style={{
                backgroundColor: "#c2c2c2", color: "#c5221f", borderRadius: 3,
                padding: "10px 14px", fontSize: 13, marginBottom: "1.5rem",
                display: "flex", alignItems: "center", gap: 8, textAlign: "left"
              }}>
                <i className="ti ti-alert-circle" aria-hidden="true"></i>
                <span>Não foi possível salvar na base de dados. Verifique a URL do Apps Script.</span>
              </div>
            )}

            {!saveError && (
              <div style={{
                backgroundColor: B.blueBg, color: B.textSec, borderRadius: 3,
                padding: "10px 14px", fontSize: 13, marginBottom: "1.5rem",
                display: "flex", alignItems: "center", gap: 8, textAlign: "left"
              }}>
                <i className="ti ti-table" aria-hidden="true"></i>
                <span>Os dados foram salvos com sucesso.</span>
              </div>
            )}

            <button type="button" onClick={handleNewProject} style={btnPrimary}>
              <i className="ti ti-plus" aria-hidden="true"></i> Novo projeto
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh",
  backgroundImage: "url('https://us.bosch-press.com/pressportal/us/media/dam_images_us/pi231_usus/37170_bosch_lw3_family_final_1_img_w1600.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  paddingTop: 4 }}
      onClick={() => setOpenDropdown(null)}
    >
      <div style={{
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(37, 37, 37, 0.55)",
    zIndex: 0
  }} />
      
      {/* ── Bosch Header ── */}
      <div style={{
        backgroundColor: B.dark, height: 52,
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        position: "relative", zIndex: 1
      }}>
        <img
  src="https://upload.wikimedia.org/wikipedia/commons/1/16/Bosch-logo.svg"
  alt="Bosch"
  style={{ height: 22,
    backgroundColor: "white",
    padding: "3px 10px",
    borderRadius: 10, }}
/>
        <span style={{ color: "#706c6c", fontSize: 12, borderLeft: "1px solid #444", paddingLeft: 16 }}>
          Cadastro de Projeto — Dashboard
        </span>
      </div>

      {/* ── Content wrapper ── */}
      <div style={{ maxWidth: 680,
         margin: "0 auto",
          padding: "2rem 1rem",
          position: "relative", zIndex: 1 }}>

        {/* ── Page title ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h2 style={{ margin: "0 0 0.25rem", fontSize: 20, fontWeight: 700, color: B.textSec }}>
            Novo Projeto
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: B.textSec }}>
            Preencha os dados do projeto para alimentar o dashboard.
          </p>
        </div>

        {/* ── Stepper ── */}
        <div style={{
          display: "flex", alignItems: "center",
          marginBottom: "1.75rem", overflowX: "auto", paddingBottom: 8
        }}>
          {STEPS.map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : 0, minWidth: i < STEPS.length - 1 ? 56 : "auto" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  onClick={() => i < step && setStep(i)}
                  style={{
                    width: 30, height: 30, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    backgroundColor:
                      i < step  ? B.bgGreen :
                      i === step ? B.red     : B.bgGray,
                    color:
                      i < step  ? B.textGreen :
                      i === step ? "#ffffff"      : B.textTer,
                    border:
                      i < step  ? `2px solid ${B.borderGreen}` :
                      i === step ? `2px solid ${B.red}`         : `1px solid ${B.border}`,
                    cursor: i < step ? "pointer" : "default",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                >
                  {i < step
                    ? <i className="ti ti-check" style={{ fontSize: 14 }} aria-hidden="true"></i>
                    : i + 1}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: i === step ? 700 : 500,
                  color: i === step ? B.red : B.textTer,
                  whiteSpace: "nowrap"
                }}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 2, marginBottom: 18,
                  backgroundColor: i < step ? B.borderGreen : B.border,
                  transition: "background 0.3s"
                }} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step card ── */}
        <div style={{
          backgroundColor: B.bg,
          border: `1px solid ${B.border}`,
          borderTop: `3px solid ${B.red}`,
          borderRadius: 4,
          padding: "1.75rem",
          marginBottom: "1rem",
          boxShadow: "0 2px 10px rgba(0,0,0,0.07)"
        }}>

          {/* STEP 0: Project name */}
          {step === 0 && (
            <div>
              <label style={labelStyle}>Nome do projeto</label>
              <input
                type="text"
                value={form.projectName}
                onChange={e => update("projectName", e.target.value)}
                placeholder="Ex: GWS 9-125"
                style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}
                autoFocus
              />
              <p style={hintStyle}>Nome completo do projeto conforme aparece no dashboard. Obs: não adicionar a versão do projeto ao nome.</p>
            </div>
          )}

          {/* STEP 1: Versões */}
          {step === 1 && (
            <div>
              <label style={labelStyle}>Versões do projeto</label>
              <p style={hintStyle}>Defina as versões disponíveis (ex: tipo de bateria, tipo de embalagem).</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16, marginTop: 14 }}>
                {form.versions.map((version) => (
                  <div key={version.id} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    backgroundColor: B.bgGray, padding: "14px",
                    borderRadius: 4, border: `1px solid ${B.border}`
                  }}>
                    <div style={{ display: "flex", gap: 10, flex: 1 }}>
                      <select
                        value={version.type}
                        onChange={e => updateVersion(version.id, "type", e.target.value)}
                        style={{ flex: 1, height: 38, fontSize: 13, borderRadius: 3, border: `1px solid ${B.border}`, padding: "0 8px", fontFamily: "inherit" }}
                      >
                        <option value="" disabled>Selecione a Versão...</option>
                        {VERSION_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                      </select>
                      <select
                        value={version.packaging}
                        onChange={e => updateVersion(version.id, "packaging", e.target.value)}
                        style={{ flex: 1, height: 38, fontSize: 13, borderRadius: 3, border: `1px solid ${B.border}`, padding: "0 8px", fontFamily: "inherit" }}
                      >
                        <option value="" disabled>Selecione o Packaging...</option>
                        {PACKAGING_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                      </select>
                    </div>
                    {form.versions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVersion(version.id)}
                        style={{ ...btnGhost, color: B.red, border: `1px solid ${B.border}` }}
                        title="Remover Versão"
                      >
                        <i className="ti ti-trash" aria-hidden="true"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" onClick={addVersion} style={{ ...btnBase, fontSize: 13 }}>
                <i className="ti ti-plus" aria-hidden="true"></i> Adicionar versão
              </button>
            </div>
          )}

          {/* STEP 2: SKUs */}
          {step === 2 && (() => {
            const filledSkus = form.skus.filter(s => s.value.trim());
            const skusWithoutCountry = filledSkus.filter(s => !s.countries || s.countries.length === 0);
            const skusIncomplete = filledSkus.filter(s => !isSkuComplete(s.value));

            return (
              <div>
                <label style={labelStyle}>SKUs por Versão</label>
                <p style={hintStyle}>Adicione os códigos de SKU para cada versão configurada.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 12, marginTop: 16 }}>
                  {form.versions.map(version => {
                    const versionSkus = form.skus.filter(s => s.versionId === version.id);
                    return (
                      <div key={version.id} style={{
                        backgroundColor: B.bgGray,
                        border: `1px solid ${B.border}`,
                        borderLeft: `3px solid ${B.blue}`,
                        borderRadius: 4,
                        padding: "14px 16px"
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 13, color: B.textSec, fontWeight: 700, letterSpacing: "0.01em" }}>
                          {version.type || "Sem Versão"}
                          <span style={{ color: B.textTer, fontWeight: 400 }}> · {version.packaging || "Sem Embalagem"}</span>
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {versionSkus.map((sku, i) => (
                            <div key={sku.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <input
                                type="text"
                                value={sku.value}
                                onChange={e => updateSku(sku.id, "value", maskSku(e.target.value))}
                                placeholder="SKU — ex: 0601.9N4.3E1"
                                maxLength={12}
                                style={{ ...inputBase, flex: 1 }}
                                autoFocus={i === versionSkus.length - 1 && i > 0}
                              />
                              <CountryDropdown skuId={sku.id} selected={sku.countries || []} />
                              {versionSkus.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeSku(sku.id)}
                                  style={{ ...btnGhost, color: B.red, border: `1px solid ${B.border}` }}
                                  title="Remover SKU"
                                >
                                  <i className="ti ti-trash" aria-hidden="true"></i>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => addSkuToVersion(version.id)}
                          style={{ ...btnGhost, fontSize: 12, marginTop: 10, color: B.textSec, padding: 0, border: "none" }}
                        >
                          <i className="ti ti-plus" aria-hidden="true"></i> Adicionar SKU nesta versão
                        </button>
                      </div>
                    );
                  })}
                </div>

                {skusWithoutCountry.length > 0 && filledSkus.length > 0 && (
                  <div style={{
                    marginTop: 14, backgroundColor: "#fff8e1",
                    border: "1px solid #f9a825", borderRadius: 3,
                    padding: "10px 14px", fontSize: 12,
                    color: "#b45309", display: "flex", alignItems: "flex-start", gap: 8
                  }}>
                    <i className="ti ti-alert-triangle" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}></i>
                    <span>Os SKUs preenchidos precisam ter pelo menos um país selecionado para avançar.</span>
                  </div>
                )}

                {skusIncomplete.length > 0 && (
                  <div style={{
                    marginTop: 14, backgroundColor: "#fff8e1",
                    border: "1px solid #f9a825", borderRadius: 3,
                    padding: "10px 14px", fontSize: 12,
                    color: "#b45309", display: "flex", alignItems: "flex-start", gap: 8
                  }}>
                    <i className="ti ti-alert-triangle" aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }}></i>
                    <span>O SKU deve conter 10 caracteres no formato 0000.000.000.</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* STEP 3: Production */}
          {step === 3 && (() => {
            const validSkus = form.skus.filter(s => s.value.trim());
            const currentSkuId = getActiveSkuId(activeProdSkuId, "prod");
            const currentMonths = (currentSkuId && form.productionMonthsBySku[currentSkuId])
              ? form.productionMonthsBySku[currentSkuId]
              : emptyMonthValues();
            const currentStartDate = currentSkuId ? (form.productionStartDateBySku[currentSkuId] || "") : "";

            return (
              <div>
                <label style={labelStyle}>Plano de produção — 12 meses</label>

                {validSkus.length > 1 && (
                  <div style={{
                    display: "flex", gap: 6, flexWrap: "wrap",
                    marginBottom: 16, borderBottom: `1px solid ${B.border}`, paddingBottom: 10
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
                            ...btnBase,
                            fontSize: 12, padding: "4px 12px",
                            fontWeight: isActive ? 700 : 500,
                            backgroundColor: isActive ? B.red : B.bgGray,
                            color: isActive ? "#fff" : B.textSec,
                            borderColor: isActive ? B.red : hasDate ? B.borderGreen : B.border,
                          }}
                        >
                          {sku.value}
                          {!hasDate && <span style={{ marginLeft: 4, color: isActive ? "#ffaaaa" : B.red, fontSize: 10 }}>●</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {validSkus.length === 1 && (
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: B.textSec,
                    marginBottom: 12, padding: "5px 10px",
                    backgroundColor: B.blueBg,
                    borderRadius: 3, display: "inline-block",
                    border: `1px solid ${B.blueBorder}`
                  }}>
                    SKU: {validSkus[0].value}
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Mês de início da produção</label>
                  <input
                    type="month"
                    value={currentStartDate}
                    onChange={e => updateStartDateBySku("prod", currentSkuId, e.target.value)}
                    style={{ ...inputBase, width: "auto" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                  {currentMonths.map((val, i) => (
                    <div key={i}>
                      <label style={{ display: "block", fontSize: 11, color: B.textPri, marginBottom: 4, fontWeight: 600 }}>
                        {getMonthLabel(currentStartDate, i)}
                      </label>
                      <input
                        type="number" min="0" value={val}
                        onChange={e => updateMonthVal("prod", currentSkuId, i, e.target.value)}
                        onPaste={e => handleMonthPaste(e, "prod", currentSkuId, i)}
                        style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* STEP 4: Sales */}
          {step === 4 && (() => {
            const validSkus = form.skus.filter(s => s.value.trim());
            const currentSkuId = getActiveSkuId(activeSalesSkuId, "sales");
            const currentMonths = (currentSkuId && form.salesMonthsBySku[currentSkuId])
              ? form.salesMonthsBySku[currentSkuId]
              : emptyMonthValues();
            const currentStartDate = currentSkuId ? (form.salesStartDateBySku[currentSkuId] || "") : "";

            return (
              <div>
                <label style={labelStyle}>Plano de vendas — 12 meses</label>

                {validSkus.length > 1 && (
                  <div style={{
                    display: "flex", gap: 6, flexWrap: "wrap",
                    marginBottom: 16, borderBottom: `1px solid ${B.border}`, paddingBottom: 10
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
                            ...btnBase,
                            fontSize: 12, padding: "4px 12px",
                            fontWeight: isActive ? 700 : 500,
                            backgroundColor: isActive ? B.red : B.bgGray,
                            color: isActive ? "#fff" : B.textSec,
                            borderColor: isActive ? B.red : hasDate ? B.borderGreen : B.border,
                          }}
                        >
                          {sku.value}
                          {!hasDate && <span style={{ marginLeft: 4, color: isActive ? "#ffaaaa" : B.red, fontSize: 10 }}>●</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

              {validSkus.length === 1 && (
              <div style={{
                fontSize: 12, fontWeight: 600, color: B.textSec,
                marginBottom: 12, padding: "5px 10px",
                backgroundColor: B.blueBg,
                borderRadius: 3, display: "inline-block",
                border: `1px solid ${B.blueBorder}`
              }}>
                SKU: {validSkus[0].value}
              </div>
              )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ ...labelStyle, fontSize: 12 }}>Mês de início das vendas</label>
                  <input
                    type="month"
                    value={currentStartDate}
                    onChange={e => updateStartDateBySku("sales", currentSkuId, e.target.value)}
                    style={{ ...inputBase, width: "auto" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                  {currentMonths.map((val, i) => (
                    <div key={i}>
                      <label style={{ display: "block", fontSize: 11, color: B.textPri, marginBottom: 4, fontWeight: 600 }}>
                        {getMonthLabel(currentStartDate, i)}
                      </label>
                      <input
                        type="number" min="0" value={val}
                        onChange={e => updateMonthVal("sales", currentSkuId, i, e.target.value)}
                        onPaste={e => handleMonthPaste(e, "sales", currentSkuId, i)}
                        style={{ ...inputBase, width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* STEP 5: OM1 Target */}
          {step === 5 && (
            <div>
              <label style={labelStyle}>OM1% Target</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={form.om1Target}
                  onChange={e => update("om1Target", e.target.value)}
                  placeholder="Ex: 39.2"
                  style={{ ...inputBase, width: 160 }}
                  autoFocus
                />
                <span style={{ fontSize: 16, color: B.textSec, fontWeight: 700 }}>%</span>
              </div>
            </div>
          )}


          {/* STEP 6: RuQ Target */}
          {step === 6 && (
            <div>
              <label style={labelStyle}>RuQ% Target</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={form.ruqTarget}
                  onChange={e => update("ruqTarget", e.target.value)}
                  placeholder="Ex: 39.2"
                  style={{ ...inputBase, width: 160 }}
                  autoFocus
                />
                <span style={{ fontSize: 16, color: B.textSec, fontWeight: 700 }}>%</span>
              </div>
            </div>
          )}

          {/* STEP 7: MAV / SOL dates */}
          {step === 7 && (() => {
            const validSkus = form.skus.filter(s => s.value.trim());
            if (validSkus.length === 0 || validSkus.every(s => !s.countries || s.countries.length === 0)) {
              return (
                <div>
                  <label style={labelStyle}>Datas planejadas</label>
                  <p style={hintStyle}>Você precisa adicionar SKUs e selecionar os países para definir as datas.</p>
                </div>
              );
            }
            return (
              <div>
                <label style={labelStyle}>Datas planejadas (MAV / SOL por País)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
                  {validSkus.map(sku => {
                    if (!sku.countries || sku.countries.length === 0) return null;
                    return (
                      <div key={sku.id} style={{
                        backgroundColor: B.bg,
                        borderRadius: 4,
                        padding: "1.25rem",
                        border: `1px solid ${B.border}`,
                        borderLeft: `3px solid ${B.red}`
                      }}>
                        <h4 style={{ margin: "0 0 12px 0", fontSize: 13, color: B.textPri, fontWeight: 700 }}>
                          SKU: <span style={{ color: B.blue }}>{sku.value}</span>
                        </h4>
                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 12, marginBottom: 8, fontSize: 11, fontWeight: 700, color: B.textPri, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          <div>País</div><div>Data MAV</div><div>Data SOL</div>
                        </div>
                        {sku.countries.map(code => {
                          const countryObj = COUNTRIES.find(c => c.code === code);
                          return (
                            <div key={code} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 12, alignItems: "center", marginBottom: 8 }}>
                              <div style={{ fontSize: 13, color: B.textPri }}>{countryObj ? countryObj.label : code}</div>
                              <input type="month" value={form.mavDates?.[sku.id]?.[code] || ""} onChange={e => updateCountryDate("mav", sku.id, code, e.target.value)} style={{ ...inputBase, width: "100%", fontSize: 12, padding: "6px 8px", boxSizing: "border-box" }} />
                              <input type="month" value={form.solDates?.[sku.id]?.[code] || ""} onChange={e => updateCountryDate("sol", sku.id, code, e.target.value)} style={{ ...inputBase, width: "100%", fontSize: 12, padding: "6px 8px", boxSizing: "border-box" }} />
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

          {/* STEP 8: Review */}
          {step === 8 && (
            <div>
              <h3 style={{ margin: "0 0 1rem", fontSize: 15, fontWeight: 700, color: B.textPri }}>
                Revisão dos dados
              </h3>
              <ReviewRow label="Projeto" value={form.projectName} />

              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <span style={reviewLabelStyle}>Versões e SKUs mapeados</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {form.versions.map(version => {
                    const vSkus = form.skus.filter(s => s.versionId === version.id && s.value.trim());
                    if (vSkus.length === 0) return null;
                    return (
                      <div key={version.id} style={{
                        backgroundColor: B.bg, padding: "10px 12px",
                        borderRadius: 3, borderLeft: `3px solid ${B.red}`
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: B.textPri, marginBottom: 4 }}>
                          {version.type || "N/A"} · {version.packaging || "N/A"}
                        </div>
                        <div style={{ fontSize: 12, color: B.textPri }}>
                          {vSkus.map(s => `${s.value} (${(s.countries || []).join(", ")})`).join(" | ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <ReviewRow label="OM1% Target" value={`${parseFloat(form.om1Target || 0).toFixed(1)}%`} />
              <ReviewRow label="RuQ% Target" value={`${parseFloat(form.ruqTarget || 0).toFixed(1)}%`} />
            </div>
          )}
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              ...btnBase,
              opacity: step === 0 ? 0.3 : 1,
              cursor: step === 0 ? "not-allowed" : "pointer"
            }}
          >
            <i className="ti ti-arrow-left" aria-hidden="true"></i> Voltar
          </button>

          <span style={{ fontSize: 12, color: B.textPri, fontWeight: 600 }}>
            {step + 1} / {STEPS.length}
          </span>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              style={{
                ...btnPrimary,
                opacity: canNext() ? 1 : 0.35,
                cursor: canNext() ? "pointer" : "not-allowed"
              }}
            >
              Próximo <i className="ti ti-arrow-right" aria-hidden="true"></i>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              style={{
                ...btnPrimary,
                backgroundColor: saving ? B.bgGray : B.red,
                color: saving ? B.textTer : "#fff",
                borderColor: saving ? B.border : B.red,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? "not-allowed" : "pointer"
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
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<ProjectDataCollector />);