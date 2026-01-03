import { EnlargeValue, Noise, Style } from "../enums"

export interface EnlargeConfig {
    style: Style | `${Style}`,
    noise: Noise | `${Noise}`,
    x2: EnlargeValue | `${EnlargeValue}`,
    input: string
}