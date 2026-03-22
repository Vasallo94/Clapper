import React from "react"
import type { ThemeName } from "./schema"

export const ThemeContext = React.createContext<ThemeName>("default")
export const useTheme = () => React.useContext(ThemeContext)
