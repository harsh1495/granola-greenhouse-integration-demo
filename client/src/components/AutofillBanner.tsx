// Optional: extract the autofill banner into a reusable component
// For now, the banner is built directly in InterviewKitPage.jsx
// using styles from InterviewKitPage.module.css

interface AutofillBannerProps {
  noteTitle: string
  onAutofill: () => void
  isAutofilled: boolean
}

export default function AutofillBanner({ noteTitle, onAutofill, isAutofilled }: AutofillBannerProps) {
  // TODO (optional): Extract banner markup from InterviewKitPage if desired
  return null
}
