import type { ButtonVariant } from "#ui/interactive/button/buttonCva.js"

export function adminShellViewStateCreate<TSection extends string>(
  activeSection: () => TSection,
  onSelectSection: (section: TSection) => void,
) {
  const sectionVariant = (section: TSection): ButtonVariant => (activeSection() === section ? "filledBlue" : "ghost")
  const selectSection = (section: TSection) => () => onSelectSection(section)

  return { sectionVariant, selectSection }
}
