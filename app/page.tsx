import { Navbar } from "@/components/ui/Navbar"
import { Hero } from "@/components/sections/Hero"
import { HowItWorks } from "@/components/sections/HowItWorks"
import { Benefits } from "@/components/sections/Benefits"
import { IspMap } from "@/components/sections/IspMap"
import { Faq } from "@/components/sections/Faq"
import { RegisterForm } from "@/components/sections/RegisterForm"
import { Footer } from "@/components/sections/Footer"

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Benefits />
        <IspMap />
        <Faq />
        <RegisterForm />
      </main>
      <Footer />
    </>
  )
}
