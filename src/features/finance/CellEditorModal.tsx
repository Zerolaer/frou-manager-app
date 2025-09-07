import React, { useMemo } from "react";
import Modal from "@/components/ui/Modal";

type Entry = {
  id: string;
  amount: number;       // in EUR
  description?: string;
  inactive?: boolean;   // visually dimmed = not counted
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  entries: Entry[];     // current cell items
};

const eur = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

export default function CellEditorModal({ open, onClose, onSave, entries }: Props) {
  const total = useMemo(() => {
    return entries.reduce((sum, e) => sum + (e.inactive ? 0 : (Number(e.amount) || 0)), 0);
  }, [entries]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Редактирование ячейки"
      footerStart={
        <div className="text-sm text-gray-500">
          Итого по ячейке:&nbsp;
          <span className="font-medium text-gray-900">{eur.format(total)}</span>
        </div>
      }
      footerEnd={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={onSave}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Сохранить
          </button>
        </>
      }
    >
      {/* Keep your existing cell editor body here (inputs/list etc.) */}
    </Modal>
  );
}
