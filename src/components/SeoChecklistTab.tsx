import React, { useState } from "react";
import { CheckSquare, CheckCircle2, Search, Plus, Check, Trash2 } from "lucide-react";
import type { ManualSEOTask } from "../types";

interface SeoChecklistTabProps {
  seoChecklist: ManualSEOTask[];
  setSeoChecklist: React.Dispatch<React.SetStateAction<ManualSEOTask[]>>;
  defaultChecklist: ManualSEOTask[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export default function SeoChecklistTab({
  seoChecklist,
  setSeoChecklist,
  defaultChecklist,
  showToast,
}: SeoChecklistTabProps) {
  const [chkNewTitle, setChkNewTitle] = useState("");
  const [chkNewCategory, setChkNewCategory] = useState("SEO On-Page");
  const [chkNewPriority, setChkNewPriority] = useState<"high" | "medium" | "low">("medium");
  const [chkNewNotes, setChkNewNotes] = useState("");
  const [chkFilterCategory, setChkFilterCategory] = useState("all");
  const [chkFilterStatus, setChkFilterStatus] = useState<"all" | "pending" | "completed">("all");
  const [chkSearchQuery, setChkSearchQuery] = useState("");

  const completedCount = seoChecklist.filter((t) => t.completed).length;
  const progressPct = seoChecklist.length > 0 ? Math.round((completedCount / seoChecklist.length) * 100) : 0;

  const filteredTasks = seoChecklist.filter((t) => {
    const matchCategory = chkFilterCategory === "all" || t.category === chkFilterCategory;
    const matchStatus =
      chkFilterStatus === "all" ||
      (chkFilterStatus === "completed" && t.completed) ||
      (chkFilterStatus === "pending" && !t.completed);
    const matchSearch =
      !chkSearchQuery.trim() ||
      t.title.toLowerCase().includes(chkSearchQuery.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(chkSearchQuery.toLowerCase()));
    return matchCategory && matchStatus && matchSearch;
  });

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Header Bento Card */}
      <div className="bento-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-800/80">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-zinc-100">
              Checklist de Implementação SEO
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Controle de execução de melhorias on-page, técnicas, conteúdo e autoridade.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Deseja desmarcar todas as tarefas e redefinir o checklist para o padrão de fábrica?"
                  )
                ) {
                  setSeoChecklist(defaultChecklist);
                  showToast("Checklist redefinido com sucesso!", "info");
                }
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors cursor-pointer"
            >
              Restaurar Padrões
            </button>
            <button
              type="button"
              onClick={() => {
                if (completedCount === 0) {
                  showToast("Nenhuma tarefa concluída para desmarcar.", "info");
                  return;
                }
                setSeoChecklist((prev) => prev.map((t) => ({ ...t, completed: false })));
                showToast("Todas as tarefas foram desmarcadas!", "success");
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 transition-colors cursor-pointer"
            >
              Desmarcar Todas
            </button>
          </div>
        </div>

        {/* Progress KPI Row */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 block">
                Tarefas Ativas
              </span>
              <span className="font-mono tabular-nums text-xl font-bold text-zinc-100">
                {seoChecklist.length}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 block">
                Concluídas
              </span>
              <span className="font-mono tabular-nums text-xl font-bold text-emerald-400">
                {completedCount}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950/65 border border-zinc-800/80 flex flex-col justify-center">
            <div className="flex justify-between text-[10px] font-mono uppercase text-zinc-400 mb-2">
              <span>Progresso Geral</span>
              <span className="font-bold text-emerald-400 tabular-nums">{progressPct}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Sidebar: Filters & Add Form (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bento-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-zinc-100 pb-2 border-b border-zinc-800/80">
              Filtros & Busca
            </h3>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">
                Buscar tarefa
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrar por palavra-chave..."
                  value={chkSearchQuery}
                  onChange={(e) => setChkSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">
                Categoria
              </label>
              <select
                value={chkFilterCategory}
                onChange={(e) => setChkFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs cursor-pointer"
              >
                <option value="all">Todas as Categorias</option>
                <option value="SEO On-Page">SEO On-Page</option>
                <option value="SEO Técnico">SEO Técnico</option>
                <option value="Conteúdo">Conteúdo</option>
                <option value="Link Building">Link Building</option>
                <option value="SEO Local">SEO Local</option>
                <option value="Personalizado">Personalizado</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">
                Status
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800">
                {(["all", "pending", "completed"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setChkFilterStatus(status)}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      chkFilterStatus === status
                        ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    {status === "all" ? "Todos" : status === "pending" ? "Pendentes" : "Feitos"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bento-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm text-zinc-100 pb-2 border-b border-zinc-800/80 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-400" />
              <span>Nova Tarefa Manual</span>
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chkNewTitle.trim()) {
                  showToast("Por favor, digite o título da tarefa.", "error");
                  return;
                }
                const newTask: ManualSEOTask = {
                  id: Date.now().toString(),
                  title: chkNewTitle.trim(),
                  category: chkNewCategory,
                  completed: false,
                  priority: chkNewPriority,
                  notes: chkNewNotes.trim() || undefined,
                };
                setSeoChecklist((prev) => [newTask, ...prev]);
                setChkNewTitle("");
                setChkNewNotes("");
                showToast("Tarefa de SEO adicionada!", "success");
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Implementar Schema Organization"
                  value={chkNewTitle}
                  onChange={(e) => setChkNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={chkNewCategory}
                    onChange={(e) => setChkNewCategory(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    <option value="SEO On-Page">SEO On-Page</option>
                    <option value="SEO Técnico">SEO Técnico</option>
                    <option value="Conteúdo">Conteúdo</option>
                    <option value="Link Building">Link Building</option>
                    <option value="SEO Local">SEO Local</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                    Prioridade
                  </label>
                  <select
                    value={chkNewPriority}
                    onChange={(e) => setChkNewPriority(e.target.value as "high" | "medium" | "low")}
                    className="w-full px-2.5 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                  Notas / Instruções
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhes técnicos ou referências..."
                  value={chkNewNotes}
                  onChange={(e) => setChkNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full btn-indigo-glow flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar à Lista</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right List (8 cols) */}
        <div className="lg:col-span-8 bento-card p-5 flex flex-col min-h-105">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800/80">
            <h3 className="font-display font-semibold text-sm text-zinc-100">
              Listagem de Otimizações
            </h3>
            <span className="text-xs font-mono tabular-nums text-zinc-400">
              {filteredTasks.length} / {seoChecklist.length} tarefas
            </span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-150 pr-1">
            {filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500">
                <CheckSquare className="h-10 w-10 mb-2.5 opacity-40" />
                <p className="text-xs font-semibold text-zinc-300">
                  Nenhuma tarefa encontrada com os filtros ativos.
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const priorityLabel =
                  task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa";
                const priorityTone =
                  task.priority === "high"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : task.priority === "medium"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400";

                return (
                  <div
                    key={task.id}
                    className={`flex items-start justify-between gap-4 p-4 rounded-xl border transition-all ${
                      task.completed
                        ? "bg-zinc-950/40 border-zinc-800/50 opacity-65"
                        : "bg-zinc-950/75 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <button
                        type="button"
                        onClick={() =>
                          setSeoChecklist((prev) =>
                            prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
                          )
                        }
                        className={`mt-0.5 h-5 w-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                          task.completed
                            ? "bg-emerald-500 border-emerald-400 text-zinc-950"
                            : "bg-zinc-900 border-zinc-700 hover:border-indigo-500 text-transparent"
                        }`}
                        aria-label="Alternar conclusão da tarefa"
                      >
                        <Check className="h-3 w-3 stroke-3" />
                      </button>

                      <div className="space-y-1 flex-1">
                        <p
                          onClick={() =>
                            setSeoChecklist((prev) =>
                              prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
                            )
                          }
                          className={`text-xs font-semibold cursor-pointer ${
                            task.completed ? "line-through text-zinc-500" : "text-zinc-100"
                          }`}
                        >
                          {task.title}
                        </p>

                        {task.notes && <p className="text-[11px] text-zinc-400">{task.notes}</p>}

                        <div className="flex flex-wrap gap-1.5 pt-1 font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] text-indigo-300">
                            {task.category}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] ${priorityTone}`}>
                            {priorityLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSeoChecklist((prev) => prev.filter((t) => t.id !== task.id));
                        showToast("Tarefa removida com sucesso.", "info");
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir tarefa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
