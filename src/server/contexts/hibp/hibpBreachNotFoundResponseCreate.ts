import { hibpBreachResponseCreate } from "./hibpBreachResponseCreate.js"

export function hibpBreachNotFoundResponseCreate(): Response {
  return hibpBreachResponseCreate({}, 404)
}
