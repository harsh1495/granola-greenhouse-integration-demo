import { useNavigate } from 'react-router-dom'
import Button from './components/Button'
import GranolaIcon from './assets/granola.svg?react'
import GreenhouseIcon from './assets/greenhouse.svg?react'
import styles from './HomePage.module.css'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Granola × Greenhouse</h1>
      <p className={styles.subheading}><a href='https://docs.google.com/document/d/1vF3aLPS17vSIzU2FCyMY-nUMCw6S_66HEJ1Ah9FbVVc/edit?tab=t.0' target='_blank'>Why?</a></p>
      <div className={styles.buttons}>
        <Button icon={<GranolaIcon />} onClick={() => navigate('/granola')}>
          Granola
        </Button>
        <Button icon={<GreenhouseIcon />} onClick={() => navigate('/greenhouse')}>
          Greenhouse
        </Button>
      </div>
    </div>
  )
}
