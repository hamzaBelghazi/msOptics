import { Search, RefreshCw, Plus, Loader2 } from "lucide-react";

export const inputCls =
 "w-full px-3 py-2 rounded-lg bg-input-background border border-input-border text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-input-ring";

export const labelCls =
 "block text-xs font-semibold text-text-secondary mb-1 uppercase tracking-wide";

export const btnPrimary =
 "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover disabled:opacity-50";

export const btnGhost =
 "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-text-secondary text-xs font-medium hover:bg-background hover:text-text-primary disabled:opacity-50";

export const btnDanger =
 "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 disabled:opacity-50";

// Small inline spinner used inside submit buttons while a request is in flight.
export function Spinner({ size = 16, className = "" }) {
 return (
 <Loader2
 size={size}
 className={`animate-spin ${className}`}
 aria-hidden="true"
 />
 );
}

export function PageHeader({ title, subtitle, action }) {
 return (
 <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
 <div>
 <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
 {subtitle && (
 <p className="text-sm text-text-secondary mt-1">{subtitle}</p>
 )}
 </div>
 {action}
 </div>
 );
}

export function Toolbar({ children, onRefresh }) {
 return (
 <div className="flex flex-wrap items-center gap-2 mb-4">
 {children}
 {onRefresh && (
 <button onClick={onRefresh} className={btnGhost} title="Reload">
 <RefreshCw size={14} />
 </button>
 )}
 </div>
 );
}

export function SearchField({ value, onChange, placeholder }) {
 return (
 <div className="relative">
 <Search
 size={16}
 className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
 />
 <input
 value={value}
 onChange={(e) => onChange(e.target.value)}
 placeholder={placeholder || "Search..."}
 className={inputCls + " pl-9 min-w-[220px]"}
 />
 </div>
 );
}

export function AddButton({ onClick, children }) {
 return (
 <button onClick={onClick} className={btnPrimary}>
 <Plus size={16} />
 {children || "Add new"}
 </button>
 );
}

export function Card({ children, className }) {
 return (
 <div
 className={`bg-card-background border border-border rounded-xl shadow-sm overflow-hidden ${
 className || ""
 }`}
 >
 {children}
 </div>
 );
}

export function TableWrap({ children }) {
 return (
 <Card>
 <div className="overflow-x-auto">
 <table className="w-full text-sm min-w-[640px]">{children}</table>
 </div>
 </Card>
 );
}

export function Th({ children, className }) {
 return (
 <th
 className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted bg-background/60 border-b border-border ${
 className || ""
 }`}
 >
 {children}
 </th>
 );
}

export function Td({ children, className }) {
 return (
 <td
 className={`px-4 py-3 border-b border-border text-text-primary align-middle ${
 className || ""
 }`}
 >
 {children}
 </td>
 );
}

export function StatusBadge({ value }) {
 const v = String(value || "").toLowerCase();
 const map = {
 paid: "bg-green-100 text-green-700",
 delivered: "bg-green-100 text-green-700",
 shipped: "bg-blue-100 text-blue-700",
 active: "bg-green-100 text-green-700",
 on: "bg-green-100 text-green-700",
 enabled: "bg-green-100 text-green-700",
 pending: "bg-amber-100 text-amber-700",
 new: "bg-amber-100 text-amber-700",
 read: "bg-blue-100 text-blue-700",
 cancelled: "bg-red-100 text-red-700",
 failed: "bg-red-100 text-red-700",
 off: "bg-text-muted/10 text-text-secondary",
 inactive: "bg-text-muted/10 text-text-secondary",
 resolved: "bg-green-100 text-green-700",
 };
 return (
 <span
 className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
 map[v] || "bg-text-muted/10 text-text-secondary"
 }`}
 >
 {String(value)}
 </span>
 );
}

export function Modal({ open, onClose, title, children, wide }) {
 if (!open) return null;
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div
 className="absolute inset-0 bg-black/50"
 onClick={onClose}
 aria-hidden
 />
 <div
 role="dialog"
 aria-modal="true"
 className={`relative bg-card-background border border-border rounded-xl shadow-lg w-full ${
 wide ? "max-w-3xl" : "max-w-lg"
 } max-h-[90vh] overflow-y-auto`}
 >
 <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card-background">
 <h3 className="font-bold text-text-primary">{title}</h3>
 <button
 onClick={onClose}
 className="text-text-muted hover:text-text-primary text-xl leading-none px-2"
 aria-label="Close"
 >
 ×
 </button>
 </div>
 <div className="p-5">{children}</div>
 </div>
 </div>
 );
}

export function Field({ label, children }) {
 return (
 <label className="block">
 <span className={labelCls}>{label}</span>
 {children}
 </label>
 );
}

export function EmptyRow({ colSpan, text }) {
 return (
 <tr>
 <td
 colSpan={colSpan}
 className="px-4 py-8 text-center text-text-muted"
 >
 {text || "No records found."}
 </td>
 </tr>
 );
}
