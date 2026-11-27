import { useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'

export interface TrainerFieldDef<T> {
  key: keyof T
  label: string
  placeholder?: string
  multiline?: boolean
  fullWidth?: boolean
}

interface TrainerListEditorProps<T extends object> {
  title: string
  subtitle?: string
  items: T[]
  fields: TrainerFieldDef<T>[]
  createEmptyItem?: () => T
  addLabel?: string
  allowAddRemove?: boolean
  itemPrefix?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  onChange: (nextItems: T[]) => void
}

/**
 * Reusable structured list editor for Trainer Profile admin sections.
 * Supports fixed-count cards (allowAddRemove=false) and unified collapsible card bodies.
 */
export function TrainerListEditor<T extends object>({
  title,
  subtitle,
  items,
  fields,
  createEmptyItem,
  addLabel = 'Add Item',
  allowAddRemove = true,
  itemPrefix = 'Item',
  collapsible = false,
  defaultExpanded = true,
  onChange,
}: TrainerListEditorProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultExpanded)

  const handleFieldChange = (index: number, key: keyof T, value: string) => {
    const next = items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    onChange(next)
  }

  const handleRemove = (index: number) => {
    if (!allowAddRemove) return
    onChange(items.filter((_, idx) => idx !== index))
  }

  const handleAdd = () => {
    if (!allowAddRemove || !createEmptyItem) return
    onChange([...items, createEmptyItem()])
    setIsOpen(true)
  }

  const renderFieldsList = () => (
    <div className={collapsible ? 'admin-trainer-collapse-items' : 'admin-trainer-list-stack'}>
      {items.map((item, index) => (
        <div
          key={index}
          className={collapsible ? 'admin-trainer-collapse-item' : 'admin-trainer-item-card'}
        >
          <div className="admin-trainer-item-top">
            <span className="admin-trainer-item-index">
              {itemPrefix} #{index + 1}
            </span>
            {allowAddRemove && (
              <button
                type="button"
                className="admin-course-cover-remove-btn"
                onClick={() => handleRemove(index)}
                title="Remove item"
              >
                <Trash2 size={12} />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div className="admin-trainer-2col">
            {fields.map(field => {
              const rawVal = item[field.key]
              const strVal = rawVal === undefined || rawVal === null ? '' : String(rawVal)
              return (
                <div
                  key={String(field.key)}
                  className={`admin-trainer-field ${field.fullWidth || field.multiline ? 'is-full' : ''}`}
                >
                  <label>{field.label}</label>
                  {field.multiline ? (
                    <textarea
                      rows={2}
                      value={strVal}
                      onChange={e => handleFieldChange(index, field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <input
                      type="text"
                      value={strVal}
                      onChange={e => handleFieldChange(index, field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="admin-trainer-empty-note">No items available.</p>
      )}
    </div>
  )

  return (
    <div className="admin-trainer-section-divider">
      {collapsible ? (
        <div className={`admin-trainer-collapse-card ${isOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="admin-trainer-collapse-toggle"
            aria-expanded={isOpen}
            onClick={() => setIsOpen(prev => !prev)}
          >
            <div className="admin-trainer-collapse-text">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 className="admin-trainer-section-title" style={{ margin: 0 }}>
                  {title}
                </h3>
                <span className="admin-trainer-count-pill">{items.length} Cards</span>
              </div>
              {subtitle && (
                <span className="admin-trainer-hint" style={{ marginTop: 2 }}>
                  {subtitle}
                </span>
              )}
            </div>
            <ChevronDown
              size={18}
              className={`admin-trainer-collapse-chevron ${isOpen ? 'is-open' : ''}`}
            />
          </button>

          {isOpen && (
            <div className="admin-trainer-collapse-body">
              {renderFieldsList()}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="admin-trainer-list-head">
            <div>
              <h3 className="admin-trainer-section-title" style={{ marginBottom: subtitle ? 3 : 0 }}>
                {title}
              </h3>
              {subtitle && (
                <span className="admin-trainer-hint" style={{ marginTop: 0 }}>
                  {subtitle}
                </span>
              )}
            </div>

            {allowAddRemove && createEmptyItem && (
              <button type="button" className="admin-trainer-add-btn" onClick={handleAdd}>
                <Plus size={14} />
                <span>{addLabel}</span>
              </button>
            )}
          </div>
          {renderFieldsList()}
        </>
      )}
    </div>
  )
}
