import { BlackBulletPoints, type BlackBulletPointsProps } from "#ui/static/lists/BlackBulletPoints.jsx"

/** List of text items with blue bullets. */
export function BlueBulletPoints(p: BlackBulletPointsProps) {
  return <BlackBulletPoints classBullet="text-blue-700 dark:text-blue-300" {...p} />
}
