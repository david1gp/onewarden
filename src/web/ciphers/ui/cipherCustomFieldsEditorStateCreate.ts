import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { CipherCustomField } from "../schemas/cipherCustomFieldSchema.js"
import type { CipherFieldType } from "../schemas/cipherFieldTypeSchema.js"

export interface CipherCustomFieldsEditorStateProps {
  fieldsSignal: SignalObject<CipherCustomField[]>
}

export function cipherCustomFieldsEditorStateCreate(props: CipherCustomFieldsEditorStateProps) {
  const newFieldName = createSignalObject("")
  const newFieldType = createSignalObject<string>("0")

  const addField = () => {
    const name = newFieldName.get().trim()
    if (!name) return
    const typeNum = Number.parseInt(newFieldType.get(), 10) as CipherFieldType
    const fields = [...props.fieldsSignal.get()]
    fields.push({
      name,
      value: typeNum === 2 ? "false" : "",
      type: typeNum,
      linkedId: undefined,
    })
    props.fieldsSignal.set(fields)
    newFieldName.set("")
    newFieldType.set("0")
  }

  const removeField = (index: number) => {
    const fields = props.fieldsSignal.get().filter((_, i) => i !== index)
    props.fieldsSignal.set(fields)
  }

  const updateFieldName = (index: number, name: string) => {
    const fields = [...props.fieldsSignal.get()]
    const target = fields[index]
    if (target) {
      fields[index] = { ...target, name }
      props.fieldsSignal.set(fields)
    }
  }

  const updateFieldValue = (index: number, value: string) => {
    const fields = [...props.fieldsSignal.get()]
    const target = fields[index]
    if (target) {
      fields[index] = { ...target, value }
      props.fieldsSignal.set(fields)
    }
  }

  const updateFieldType = (index: number, type: CipherFieldType) => {
    const fields = [...props.fieldsSignal.get()]
    const target = fields[index]
    if (target) {
      fields[index] = {
        ...target,
        type,
        value: type === 2 ? "false" : target.value,
      }
      props.fieldsSignal.set(fields)
    }
  }

  return {
    fields: props.fieldsSignal.get,
    newFieldName,
    newFieldType,
    addField,
    removeField,
    updateFieldName,
    updateFieldValue,
    updateFieldType,
  }
}
