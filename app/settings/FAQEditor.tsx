"use client";

import { useState, useEffect, useRef } from "react";
import { updateFaqs } from "./actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Tipos para FAQs
type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
};

type FAQEditorProps = {
  restaurantId: string;
  tenantId: string;
  initialFaqs: any;
  isReadOnly: boolean;
};

// Categorías predefinidas con colores
const FAQ_CATEGORIES = [
  { id: "reservas", name: "Reservas", color: "#6366f1", emoji: "📅" },
  { id: "horarios", name: "Horarios", color: "#f59e0b", emoji: "🕐" },
  { id: "pagos", name: "Pagos", color: "#10b981", emoji: "💳" },
  { id: "alergenos", name: "Alérgenos", color: "#ef4444", emoji: "⚠️" },
  { id: "parking", name: "Parking", color: "#8b5cf6", emoji: "🚗" },
  { id: "eventos", name: "Eventos", color: "#ec4899", emoji: "🎉" },
  { id: "ninos", name: "Niños", color: "#14b8a6", emoji: "👶" },
  { id: "mascotas", name: "Mascotas", color: "#f97316", emoji: "🐕" },
  { id: "accesibilidad", name: "Accesibilidad", color: "#06b6d4", emoji: "♿" },
  { id: "general", name: "General", color: "#71717a", emoji: "❓" },
];

// Plantillas de FAQs comunes
const FAQ_TEMPLATES: Omit<FAQ, "id">[] = [
  {
    question: "¿Aceptáis reservas?",
    answer: "Sí, aceptamos reservas. Puedes reservar llamando por teléfono o a través de nuestra web.",
    category: "reservas",
    isActive: true,
  },
  {
    question: "¿Con cuánta antelación debo reservar?",
    answer: "Recomendamos reservar con al menos 24-48 horas de antelación, especialmente para fines de semana.",
    category: "reservas",
    isActive: true,
  },
  {
    question: "¿Cuál es vuestro horario de apertura?",
    answer: "Consulta nuestros horarios en la sección de Horarios de nuestra web o pregúntanos directamente.",
    category: "horarios",
    isActive: true,
  },
  {
    question: "¿Abrís los festivos?",
    answer: "Normalmente abrimos en festivos, pero te recomendamos confirmarlo con antelación.",
    category: "horarios",
    isActive: true,
  },
  {
    question: "¿Qué métodos de pago aceptáis?",
    answer: "Aceptamos efectivo, tarjetas de crédito/débito y Bizum.",
    category: "pagos",
    isActive: true,
  },
  {
    question: "¿Tenéis opciones para celíacos?",
    answer: "Sí, disponemos de opciones sin gluten. Por favor, infórmanos al hacer el pedido.",
    category: "alergenos",
    isActive: true,
  },
  {
    question: "¿Tenéis menú para alérgicos?",
    answer: "Sí, tenemos información detallada sobre alérgenos. Pregunta a nuestro personal.",
    category: "alergenos",
    isActive: true,
  },
  {
    question: "¿Hay parking cerca?",
    answer: "Sí, hay parking público a pocos metros del restaurante. También hay zona de aparcamiento en la calle.",
    category: "parking",
    isActive: true,
  },
  {
    question: "¿Organizáis eventos privados?",
    answer: "Sí, disponemos de espacios para eventos privados y celebraciones. Contacta con nosotros para más información.",
    category: "eventos",
    isActive: true,
  },
  {
    question: "¿Tenéis trona para niños?",
    answer: "Sí, disponemos de tronas y menú infantil.",
    category: "ninos",
    isActive: true,
  },
  {
    question: "¿Admitís mascotas?",
    answer: "Sí, las mascotas son bienvenidas en nuestra terraza.",
    category: "mascotas",
    isActive: true,
  },
  {
    question: "¿El local es accesible para sillas de ruedas?",
    answer: "Sí, nuestro local cuenta con acceso adaptado y baño accesible.",
    category: "accesibilidad",
    isActive: true,
  },
  {
    question: "¿Hacéis comida para llevar?",
    answer: "Sí, ofrecemos servicio de comida para llevar. Puedes hacer tu pedido por teléfono.",
    category: "general",
    isActive: true,
  },
  {
    question: "¿Tenéis wifi?",
    answer: "Sí, disponemos de wifi gratuito para nuestros clientes.",
    category: "general",
    isActive: true,
  },
];

// Componente sortable para FAQ
function SortableFAQ({
  faq,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleActive,
  isReadOnly,
}: {
  faq: FAQ;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  isReadOnly: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const category = FAQ_CATEGORIES.find(c => c.id === faq.category) || FAQ_CATEGORIES[FAQ_CATEGORIES.length - 1];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-zinc-900/40 border rounded-lg transition-all ${
        faq.isActive
          ? "border-zinc-800"
          : "border-zinc-800/50 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        {/* Drag handle */}
        {!isReadOnly && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
            </svg>
          </button>
        )}

        {/* Category badge */}
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
          style={{
            backgroundColor: `${category.color}20`,
            color: category.color,
            border: `1px solid ${category.color}40`,
          }}
        >
          {category.emoji} {category.name}
        </span>

        {/* Question */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${faq.isActive ? "text-zinc-100" : "text-zinc-400"}`}>
            {faq.question}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {/* Toggle active */}
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isReadOnly}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              faq.isActive ? "bg-emerald-600" : "bg-zinc-700"
            } disabled:opacity-50`}
            title={faq.isActive ? "Desactivar" : "Activar"}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                faq.isActive ? "left-4" : "left-0.5"
              }`}
            />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={onEdit}
            disabled={isReadOnly}
            className="p-1.5 text-zinc-400 hover:text-indigo-400 transition-colors disabled:opacity-50"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={onDelete}
            disabled={isReadOnly}
            className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors disabled:opacity-50"
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Expand - fuera del stopPropagation para que funcione el click */}
        <button
          type="button"
          onClick={onToggle}
          className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
          title={isExpanded ? "Contraer" : "Expandir"}
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          <div className="bg-zinc-900/60 rounded-lg p-3 border border-zinc-800/50">
            <p className="text-xs text-zinc-400 mb-1">Respuesta:</p>
            <p className="text-sm text-zinc-200 whitespace-pre-wrap">{faq.answer}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Función de matching de texto para el simulador
function calculateMatchScore(query: string, faq: FAQ): number {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedQuestion = faq.question.toLowerCase();
  const normalizedAnswer = faq.answer.toLowerCase();

  // Palabras de la consulta
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

  // Match exacto de pregunta = score muy alto
  if (normalizedQuestion.includes(normalizedQuery)) {
    return 100;
  }

  let score = 0;

  // Palabras clave importantes para restaurantes
  const keywords: Record<string, string[]> = {
    reservas: ["reserv", "mesa", "sitio", "hueco"],
    horarios: ["hora", "abr", "cerr", "horario", "festivo", "abierto"],
    pagos: ["pag", "tarjeta", "efectivo", "bizum", "visa", "mastercard"],
    alergenos: ["alerg", "gluten", "celiaco", "intolerancia", "vegano", "vegetariano"],
    parking: ["parking", "aparca", "coche", "estacion"],
    eventos: ["evento", "celebracion", "fiesta", "cumpleaños", "reserva privada", "grupo"],
    ninos: ["niño", "trona", "infantil", "bebe", "menu infantil"],
    mascotas: ["mascota", "perro", "gato", "animal", "pet"],
    accesibilidad: ["accesib", "silla de ruedas", "discapacidad", "minusválido", "rampa"],
    general: ["wifi", "llevar", "domicilio", "take away", "terraza"],
  };

  // Bonus por categoría
  for (const [category, catKeywords] of Object.entries(keywords)) {
    if (faq.category === category) {
      for (const keyword of catKeywords) {
        if (normalizedQuery.includes(keyword)) {
          score += 25;
        }
      }
    }
  }

  // Match de palabras en la pregunta
  for (const word of queryWords) {
    if (normalizedQuestion.includes(word)) {
      score += 15;
    }
    if (normalizedAnswer.includes(word)) {
      score += 5;
    }
  }

  return Math.min(score, 100);
}

type ChatMessage = {
  id: string;
  type: "user" | "bot";
  content: string;
  matchedFaq?: FAQ;
  confidence?: number;
  timestamp: Date;
};

export function FAQEditor({ restaurantId, tenantId, initialFaqs, isReadOnly }: FAQEditorProps) {
  // Parse initial FAQs
  const parseInitialFaqs = (): FAQ[] => {
    if (!initialFaqs || !Array.isArray(initialFaqs)) {
      return [];
    }

    return initialFaqs.map((faq: any, index: number) => ({
      id: faq.id || `faq-${Date.now()}-${index}`,
      question: faq.question || "",
      answer: faq.answer || "",
      category: faq.category || "general",
      isActive: faq.isActive !== false,
    }));
  };

  const [faqs, setFaqs] = useState<FAQ[]>(parseInitialFaqs());
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Modo de vista: "edit" o "test"
  const [viewMode, setViewMode] = useState<"edit" | "test">("edit");

  // Chat simulator state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-save states
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importMethod, setImportMethod] = useState<"url" | "text" | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  // Template editing
  const [editingTemplateIndex, setEditingTemplateIndex] = useState<number | null>(null);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [newFaq, setNewFaq] = useState<Omit<FAQ, "id">>({
    question: "",
    answer: "",
    category: "general",
    isActive: true,
  });

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // Selected templates
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-save with debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isReadOnly) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(async () => {
      await autoSaveChanges();
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [faqs]);

  // Auto-save function
  const autoSaveChanges = async () => {
    try {
      const formData = new FormData();
      formData.set("restaurantId", restaurantId);
      formData.set("tenantId", tenantId);
      formData.set("faqs", JSON.stringify(faqs));

      await updateFaqs(formData);
      setSaveStatus("saved");

      setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    } catch (err: any) {
      console.error("Error en auto-guardado:", err);
      setSaveStatus("idle");
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFaqs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Toggle expand FAQ
  const toggleExpand = (faqId: string) => {
    setExpandedFaqs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(faqId)) {
        newSet.delete(faqId);
      } else {
        newSet.add(faqId);
      }
      return newSet;
    });
  };

  // Add FAQ
  const addFaq = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;

    const faq: FAQ = {
      id: `faq-${Date.now()}`,
      ...newFaq,
    };

    setFaqs((prev) => [...prev, faq]);
    setShowAddDialog(false);
    setNewFaq({
      question: "",
      answer: "",
      category: "general",
      isActive: true,
    });
  };

  // Save edited FAQ
  const saveFaqEdit = () => {
    if (!editingFaq) return;

    setFaqs((prev) =>
      prev.map((faq) => (faq.id === editingFaq.id ? editingFaq : faq))
    );
    setEditingFaq(null);
  };

  // Delete FAQ
  const deleteFaq = (faqId: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.id !== faqId));
  };

  // Toggle FAQ active
  const toggleFaqActive = (faqId: string) => {
    setFaqs((prev) =>
      prev.map((faq) =>
        faq.id === faqId ? { ...faq, isActive: !faq.isActive } : faq
      )
    );
  };

  // Add templates
  const addSelectedTemplates = () => {
    const newFaqs: FAQ[] = [];
    selectedTemplates.forEach((index) => {
      const template = FAQ_TEMPLATES[index];
      // Check if similar FAQ already exists
      const exists = faqs.some(
        (f) => f.question.toLowerCase() === template.question.toLowerCase()
      );
      if (!exists) {
        newFaqs.push({
          id: `faq-${Date.now()}-${index}`,
          ...template,
        });
      }
    });

    if (newFaqs.length > 0) {
      setFaqs((prev) => [...prev, ...newFaqs]);
    }

    setShowTemplatesDialog(false);
    setSelectedTemplates(new Set());
  };

  // Toggle template selection
  const toggleTemplateSelection = (index: number) => {
    setSelectedTemplates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Filter FAQs
  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      !selectedCategory || faq.category === selectedCategory;

    const matchesActive = !showActiveOnly || faq.isActive;

    return matchesSearch && matchesCategory && matchesActive;
  });

  // Stats
  const activeFaqsCount = faqs.filter((f) => f.isActive).length;
  const categoriesUsed = new Set(faqs.map((f) => f.category)).size;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Enviar mensaje en el chat simulator
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: chatInput,
      timestamp: new Date(),
    };

    // Find best matching FAQ
    const activeFaqs = faqs.filter((f) => f.isActive);
    const matches = activeFaqs
      .map((faq) => ({
        faq,
        score: calculateMatchScore(chatInput, faq),
      }))
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);

    const bestMatch = matches[0];

    let botMessage: ChatMessage;

    if (bestMatch && bestMatch.score >= 20) {
      botMessage = {
        id: `msg-${Date.now()}-bot`,
        type: "bot",
        content: bestMatch.faq.answer,
        matchedFaq: bestMatch.faq,
        confidence: bestMatch.score,
        timestamp: new Date(),
      };
    } else {
      botMessage = {
        id: `msg-${Date.now()}-bot`,
        type: "bot",
        content: "Lo siento, no tengo información sobre esa consulta. ¿Puedo ayudarte con algo más?",
        confidence: 0,
        timestamp: new Date(),
      };
    }

    setChatMessages((prev) => [...prev, userMessage, botMessage]);
    setChatInput("");
  };

  // Limpiar chat
  const clearChat = () => {
    setChatMessages([]);
  };

  // Importar FAQs desde texto
  const importFromText = () => {
    if (!importText.trim()) return;

    setIsImporting(true);

    try {
      // Intentar parsear como JSON primero
      try {
        const parsed = JSON.parse(importText);
        if (Array.isArray(parsed)) {
          const newFaqs: FAQ[] = parsed.map((item: any, index: number) => ({
            id: `faq-import-${Date.now()}-${index}`,
            question: item.question || item.pregunta || "",
            answer: item.answer || item.respuesta || "",
            category: item.category || item.categoria || "general",
            isActive: item.isActive !== false,
          })).filter(f => f.question && f.answer);

          if (newFaqs.length > 0) {
            setFaqs(prev => [...prev, ...newFaqs]);
            setShowImportDialog(false);
            setImportText("");
            setImportMethod(null);
            return;
          }
        }
      } catch {
        // No es JSON, intentar parsear como texto plano
      }

      // Parsear como texto plano (P: ... R: ...)
      const lines = importText.split("\n");
      const newFaqs: FAQ[] = [];
      let currentQuestion = "";
      let currentAnswer = "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.match(/^(P:|Pregunta:|Q:|Question:)/i)) {
          if (currentQuestion && currentAnswer) {
            newFaqs.push({
              id: `faq-import-${Date.now()}-${newFaqs.length}`,
              question: currentQuestion,
              answer: currentAnswer,
              category: "general",
              isActive: true,
            });
          }
          currentQuestion = trimmed.replace(/^(P:|Pregunta:|Q:|Question:)\s*/i, "");
          currentAnswer = "";
        } else if (trimmed.match(/^(R:|Respuesta:|A:|Answer:)/i)) {
          currentAnswer = trimmed.replace(/^(R:|Respuesta:|A:|Answer:)\s*/i, "");
        } else if (currentAnswer && trimmed) {
          currentAnswer += " " + trimmed;
        }
      }

      // Añadir la última FAQ
      if (currentQuestion && currentAnswer) {
        newFaqs.push({
          id: `faq-import-${Date.now()}-${newFaqs.length}`,
          question: currentQuestion,
          answer: currentAnswer,
          category: "general",
          isActive: true,
        });
      }

      if (newFaqs.length > 0) {
        setFaqs(prev => [...prev, ...newFaqs]);
        setShowImportDialog(false);
        setImportText("");
        setImportMethod(null);
      } else {
        alert("No se pudieron extraer FAQs del texto. Usa el formato:\nP: Pregunta\nR: Respuesta");
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Exportar FAQs a PDF
  const exportToPDF = () => {
    // Crear contenido HTML para el PDF
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>FAQs - Backup</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
          .faq { margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
          .question { font-weight: bold; color: #1f2937; margin-bottom: 8px; }
          .answer { color: #4b5563; line-height: 1.5; }
          .category { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: 12px; background: #e0e7ff; color: #4338ca; margin-bottom: 8px; }
          .inactive { opacity: 0.5; }
          .meta { font-size: 11px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Preguntas Frecuentes (FAQs)</h1>
        <p style="color: #6b7280; margin-bottom: 30px;">Total: ${faqs.length} FAQs (${activeFaqsCount} activas)</p>
        ${faqs.map(faq => {
          const cat = FAQ_CATEGORIES.find(c => c.id === faq.category);
          return `
            <div class="faq ${!faq.isActive ? 'inactive' : ''}">
              <span class="category">${cat?.emoji || '❓'} ${cat?.name || 'General'}</span>
              ${!faq.isActive ? '<span style="color: #ef4444; font-size: 11px; margin-left: 10px;">(Inactiva)</span>' : ''}
              <div class="question">${faq.question}</div>
              <div class="answer">${faq.answer}</div>
            </div>
          `;
        }).join('')}
        <div class="meta">
          Exportado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      </body>
      </html>
    `;

    // Crear ventana para imprimir (genera PDF)
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
            Preguntas frecuentes
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {viewMode === "edit"
              ? "Configura las respuestas que el bot usará para ayudar a tus clientes"
              : "Prueba cómo responderá el bot a las preguntas de tus clientes"}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900/60 rounded-lg border border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "edit"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("test")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === "test"
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Probar
            </button>
          </div>

          {/* Save indicator */}
          {viewMode === "edit" && (saveStatus === "saving" || saveStatus === "saved") && (
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === "saving" && (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-zinc-400">Guardando...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <span className="text-emerald-400 text-base">✓</span>
                  <span className="text-emerald-400">Guardado</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============== EDIT MODE ============== */}
      {viewMode === "edit" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-zinc-100">{faqs.length}</div>
              <div className="text-xs text-zinc-400 mt-1">FAQs totales</div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-emerald-400">{activeFaqsCount}</div>
              <div className="text-xs text-zinc-400 mt-1">Activas</div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-zinc-100">{categoriesUsed}</div>
              <div className="text-xs text-zinc-400 mt-1">Categorías</div>
            </div>
          </div>

          {/* Search and filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar FAQs..."
              className="w-full text-sm rounded-lg bg-zinc-900/60 border border-zinc-700 pl-10 pr-4 py-2.5 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Toggle active only */}
          <button
            type="button"
            onClick={() => setShowActiveOnly(!showActiveOnly)}
            className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-colors border ${
              showActiveOnly
                ? "bg-emerald-900/30 border-emerald-700 text-emerald-300"
                : "bg-zinc-900/60 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Solo activas
          </button>
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
              !selectedCategory
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Todas
          </button>
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                selectedCategory === cat.id
                  ? "text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              style={{
                backgroundColor: selectedCategory === cat.id ? cat.color : "rgb(39 39 42)",
              }}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* FAQ List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredFaqs.map((f) => f.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {filteredFaqs.length === 0 && faqs.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                <div className="text-4xl mb-3">❓</div>
                <p className="text-sm text-zinc-400 mb-4">
                  Aún no hay preguntas frecuentes configuradas
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowTemplatesDialog(true)}
                    disabled={isReadOnly}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                  >
                    Usar plantillas
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddDialog(true)}
                    disabled={isReadOnly}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors disabled:opacity-50"
                  >
                    + Crear manualmente
                  </button>
                </div>
              </div>
            ) : filteredFaqs.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm text-zinc-400">
                  No se encontraron FAQs con los filtros aplicados
                </p>
              </div>
            ) : (
              filteredFaqs.map((faq) => (
                <SortableFAQ
                  key={faq.id}
                  faq={faq}
                  isExpanded={expandedFaqs.has(faq.id)}
                  onToggle={() => toggleExpand(faq.id)}
                  onEdit={() => setEditingFaq({ ...faq })}
                  onDelete={() => {
                    setConfirmDialog({
                      isOpen: true,
                      title: "Eliminar FAQ",
                      message: `¿Eliminar la pregunta "${faq.question}"?`,
                      onConfirm: () => {
                        deleteFaq(faq.id);
                        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                      },
                    });
                  }}
                  onToggleActive={() => toggleFaqActive(faq.id)}
                  isReadOnly={isReadOnly}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Action buttons */}
      {faqs.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            disabled={isReadOnly}
            className="flex-1 min-w-[140px] px-4 py-3 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
          >
            + Añadir FAQ
          </button>
          <button
            type="button"
            onClick={() => setShowTemplatesDialog(true)}
            disabled={isReadOnly}
            className="px-4 py-3 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Plantillas
          </button>
          <button
            type="button"
            onClick={() => setShowImportDialog(true)}
            disabled={isReadOnly}
            className="px-4 py-3 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            disabled={faqs.length === 0}
            className="px-4 py-3 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={isReadOnly || faqs.length === 0}
            className="px-4 py-3 rounded-lg text-sm font-medium bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Vaciar
          </button>
        </div>
      )}
        </>
      )}

      {/* ============== TEST MODE - Chat Simulator ============== */}
      {viewMode === "test" && (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
          {/* Chat header */}
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">Simulador de FAQs</p>
                <p className="text-[10px] text-zinc-500">{activeFaqsCount} FAQs activas disponibles</p>
              </div>
            </div>
            {chatMessages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Limpiar chat
              </button>
            )}
          </div>

          {/* Chat messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-400 mb-2">Escribe una pregunta para probar tus FAQs</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  El simulador buscará la mejor respuesta entre tus {activeFaqsCount} FAQs activas
                </p>
                {faqs.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Prueba con:</p>
                    <div className="flex flex-wrap gap-2 justify-center max-w-md">
                      {["¿Aceptáis reservas?", "¿Cuál es el horario?", "¿Tenéis parking?"].map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            setChatInput(q);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700/50 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              chatMessages.map((msg) => {
                const category = msg.matchedFaq
                  ? FAQ_CATEGORIES.find(c => c.id === msg.matchedFaq!.category)
                  : null;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        msg.type === "user"
                          ? "bg-indigo-600 text-white rounded-br-md"
                          : "bg-zinc-800 text-zinc-100 rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {/* Bot response metadata */}
                      {msg.type === "bot" && msg.matchedFaq && (
                        <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                              style={{
                                backgroundColor: `${category?.color || "#71717a"}20`,
                                color: category?.color || "#71717a",
                              }}
                            >
                              {category?.emoji} {category?.name}
                            </span>
                            <span className={`text-[10px] font-medium ${
                              msg.confidence! >= 70 ? "text-emerald-400" :
                              msg.confidence! >= 40 ? "text-amber-400" :
                              "text-rose-400"
                            }`}>
                              {msg.confidence}% confianza
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 truncate">
                            Matched: "{msg.matchedFaq.question}"
                          </p>
                        </div>
                      )}

                      {msg.type === "bot" && msg.confidence === 0 && (
                        <div className="mt-2 pt-2 border-t border-zinc-700/50">
                          <p className="text-[10px] text-rose-400">
                            No se encontró una FAQ que coincida
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe una pregunta..."
                className="flex-1 text-sm rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-3 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="px-5 py-3 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar
              </button>
            </form>
            <p className="text-[10px] text-zinc-600 mt-2 text-center">
              Este es un simulador local. Las respuestas reales del bot pueden variar según el contexto de la conversación.
            </p>
          </div>
        </div>
      )}

      {/* Add FAQ Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">
                Nueva FAQ
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Añade una nueva pregunta frecuente
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Pregunta *
                </label>
                <input
                  type="text"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                  placeholder="¿Cuál es la pregunta que hacen tus clientes?"
                  className="w-full text-sm rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Respuesta *
                </label>
                <textarea
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                  placeholder="Escribe la respuesta que el bot dará..."
                  rows={4}
                  className="w-full text-sm rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <p className="text-[10px] text-zinc-500 mt-1 text-right">
                  {newFaq.answer.length} caracteres
                </p>
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Categoría
                </label>
                <div className="flex flex-wrap gap-2">
                  {FAQ_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setNewFaq({ ...newFaq, category: cat.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        newFaq.category === cat.id
                          ? "text-white border-transparent"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                      }`}
                      style={{
                        backgroundColor: newFaq.category === cat.id ? cat.color : undefined,
                      }}
                    >
                      {cat.emoji} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewFaq({ question: "", answer: "", category: "general", isActive: true });
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={addFaq}
                disabled={!newFaq.question.trim() || !newFaq.answer.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Añadir FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit FAQ Dialog */}
      {editingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">
                Editar FAQ
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Pregunta *
                </label>
                <input
                  type="text"
                  value={editingFaq.question}
                  onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  className="w-full text-sm rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Respuesta *
                </label>
                <textarea
                  value={editingFaq.answer}
                  onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                  rows={4}
                  className="w-full text-sm rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-300 font-medium mb-2 block">
                  Categoría
                </label>
                <div className="flex flex-wrap gap-2">
                  {FAQ_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setEditingFaq({ ...editingFaq, category: cat.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        editingFaq.category === cat.id
                          ? "text-white border-transparent"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                      }`}
                      style={{
                        backgroundColor: editingFaq.category === cat.id ? cat.color : undefined,
                      }}
                    >
                      {cat.emoji} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setEditingFaq(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveFaqEdit}
                disabled={!editingFaq.question.trim() || !editingFaq.answer.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates Dialog */}
      {showTemplatesDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">
                Plantillas de FAQs
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Selecciona las preguntas que quieras añadir. Podrás editarlas después.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {FAQ_TEMPLATES.map((template, index) => {
                  const category = FAQ_CATEGORIES.find(c => c.id === template.category)!;
                  const alreadyExists = faqs.some(
                    (f) => f.question.toLowerCase() === template.question.toLowerCase()
                  );

                  return (
                    <div
                      key={index}
                      onClick={() => !alreadyExists && toggleTemplateSelection(index)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        alreadyExists
                          ? "bg-zinc-900/30 border-zinc-800/50 opacity-50 cursor-not-allowed"
                          : selectedTemplates.has(index)
                          ? "bg-indigo-950/30 border-indigo-600"
                          : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                          alreadyExists
                            ? "border-zinc-700 bg-zinc-800"
                            : selectedTemplates.has(index)
                            ? "border-indigo-500 bg-indigo-600"
                            : "border-zinc-600"
                        }`}>
                          {(selectedTemplates.has(index) || alreadyExists) && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                              style={{
                                backgroundColor: `${category.color}20`,
                                color: category.color,
                              }}
                            >
                              {category.emoji} {category.name}
                            </span>
                            {alreadyExists && (
                              <span className="text-[10px] text-zinc-500">Ya añadida</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-zinc-200">{template.question}</p>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{template.answer}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                {selectedTemplates.size} plantilla(s) seleccionada(s)
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplatesDialog(false);
                    setSelectedTemplates(new Set());
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={addSelectedTemplates}
                  disabled={selectedTemplates.size === 0}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                >
                  Añadir seleccionadas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear confirm dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-950/50 border border-rose-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                Vaciar FAQs
              </h3>
              <p className="text-sm text-zinc-400 mb-6">
                Se eliminarán las {faqs.length} preguntas frecuentes.
                Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFaqs([]);
                    setShowClearConfirm(false);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Vaciar FAQs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-100">
                Importar FAQs
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Importa preguntas frecuentes desde texto o JSON
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!importMethod ? (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-300 mb-4">Selecciona el método de importación:</p>

                  <button
                    type="button"
                    onClick={() => setImportMethod("text")}
                    className="w-full p-4 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-indigo-950/50 border border-indigo-800/50 flex items-center justify-center group-hover:bg-indigo-900/50">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-100">Desde texto</p>
                        <p className="text-xs text-zinc-500">Pega texto con formato P:/R: o JSON</p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setImportMethod(null)}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver
                  </button>

                  <div>
                    <label className="text-sm text-zinc-300 font-medium mb-2 block">
                      Pega tus FAQs aquí
                    </label>
                    <textarea
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={`Formato texto:\nP: ¿Pregunta 1?\nR: Respuesta 1\n\nP: ¿Pregunta 2?\nR: Respuesta 2\n\nO formato JSON:\n[{"question": "...", "answer": "..."}]`}
                      rows={10}
                      className="w-full text-sm rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2.5 text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                    />
                  </div>

                  <div className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50">
                    <p className="text-xs text-zinc-400">
                      <strong className="text-zinc-300">Formatos soportados:</strong>
                    </p>
                    <ul className="text-xs text-zinc-500 mt-1 space-y-1 list-disc list-inside">
                      <li>Texto con P: / R: (o Pregunta: / Respuesta:)</li>
                      <li>JSON: {"[{question, answer, category?}]"}</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowImportDialog(false);
                  setImportMethod(null);
                  setImportText("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Cancelar
              </button>
              {importMethod === "text" && (
                <button
                  type="button"
                  onClick={importFromText}
                  disabled={!importText.trim() || isImporting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Importando...
                    </>
                  ) : (
                    "Importar FAQs"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Eliminar"
        variant="danger"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
