"use client";

import { useState, useEffect } from "react";
import {
  type PromptTemplate,
  getTemplates,
  saveTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/templates";

interface TemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TemplateManager({ isOpen, onClose }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newInstruction, setNewInstruction] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTemplates(getTemplates());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEdit = (t: PromptTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditInstruction(t.instruction);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim() && editInstruction.trim()) {
      updateTemplate(editingId, { name: editName.trim(), instruction: editInstruction.trim() });
      setTemplates(getTemplates());
      setEditingId(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteTemplate(id);
    setTemplates(getTemplates());
  };

  const handleAdd = () => {
    if (newName.trim() && newInstruction.trim()) {
      saveTemplate({ name: newName.trim(), instruction: newInstruction.trim() });
      setTemplates(getTemplates());
      setIsAdding(false);
      setNewName("");
      setNewInstruction("");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden fade-in max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h2 className="text-base font-semibold text-white">Prompt Templates</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Template List */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {templates.map((t) => (
            <div key={t.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
              {editingId === t.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
                    placeholder="Template name"
                  />
                  <textarea
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/30 resize-none min-h-[60px]"
                    placeholder="Instruction"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 py-1.5 bg-white text-black text-xs font-medium rounded-lg cursor-pointer">Save</button>
                    <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 bg-white/10 text-white text-xs font-medium rounded-lg cursor-pointer">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white">{t.name}</p>
                    <p className="text-[10px] text-white/40 mt-0.5 truncate">{t.instruction}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleEdit(t)}
                      className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 cursor-pointer"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add New */}
          {isAdding ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/30"
                placeholder="Template name"
                autoFocus
              />
              <textarea
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/30 resize-none min-h-[60px]"
                placeholder="Instruction (e.g., 'Make this text more professional')"
              />
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={!newName.trim() || !newInstruction.trim()} className="flex-1 py-1.5 bg-white text-black text-xs font-medium rounded-lg cursor-pointer disabled:opacity-40">Add</button>
                <button onClick={() => { setIsAdding(false); setNewName(""); setNewInstruction(""); }} className="flex-1 py-1.5 bg-white/10 text-white text-xs font-medium rounded-lg cursor-pointer">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 border border-dashed border-white/10 rounded-xl text-xs text-white/40 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
            >
              + Add Template
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
