import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '@/components/app-layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ModulesSettings } from '@/components/settings/modules-settings'

export default function Configuracoes() {
  const [params, setParams] = useSearchParams()
  return (
    <AppLayout title="Configurações">
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto w-full max-w-2xl">
          <Tabs
            value={tab}
          >
            <TabsList>
              <TabsTrigger value="modulos">Módulos</TabsTrigger>
            </TabsList>
            <TabsContent value="modulos" className="pt-4">
              <ModulesSettings />
            </TabsContent>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AppLayout>
  )
}
