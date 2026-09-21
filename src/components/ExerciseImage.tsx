import { useState } from 'react'
import { getExerciseMedia } from '../data/exerciseMedia'
import type { ExerciseId } from '../types/domain'
import styles from './ExerciseImage.module.css'
import { Icon } from './Icon'

interface ExerciseImageProps {
  exerciseId: ExerciseId
  /** `hero` for the exercise screen, `card` for the active workout card, `thumb` for list rows. */
  variant?: 'hero' | 'card' | 'thumb'
  className?: string
}

/**
 * An exercise illustration, or a neutral placeholder. Images are decoration:
 * a missing file, a broken reference or a failed load never affects logging,
 * and the layout stays the same either way.
 */
export function ExerciseImage({ exerciseId, variant = 'thumb', className }: ExerciseImageProps) {
  const media = getExerciseMedia(exerciseId)
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const broken = media !== null && failedSrc === media.src

  return (
    <div className={`${styles.frame} ${styles[variant]} ${className ?? ''}`}>
      {media && !broken ? (
        <img
          className={styles.image}
          src={media.src}
          // The name sits next to thumbnails, so they add nothing for a screen reader.
          alt={variant === 'hero' ? `Illustration: ${media.description}` : ''}
          width={120}
          height={90}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(media.src)}
        />
      ) : (
        <Icon name="dumbbell" size={variant === 'hero' ? 40 : variant === 'card' ? 28 : 22} className={styles.fallback} />
      )}
    </div>
  )
}
