import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const MapaPage = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <Button asChild variant="outline" size="icon">
          <Link to="/localizacao">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Mapa Visual do Almoxarifado</h1>
      </div>
      <Card className="h-[70vh]">
        <CardHeader>
          <CardTitle>Layout do Almoxarifado</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full bg-muted/20 rounded-b-lg">
          <TooltipProvider>
            <div className="relative w-full h-full p-4 grid grid-cols-10 grid-rows-6 gap-4">
              {/* Corredores */}
              <div className="col-span-1 row-span-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-sm -rotate-90">
                Corredor A
              </div>
              <div className="col-start-3 col-span-1 row-span-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-sm -rotate-90">
                Corredor B
              </div>
              <div className="col-start-5 col-span-1 row-span-6 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-sm -rotate-90">
                Corredor C
              </div>

              {/* Prateleiras */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="col-start-2 row-span-2 bg-primary/20 border-2 border-primary rounded flex items-center justify-center cursor-pointer hover:bg-primary/30">
                    A-01
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Prateleira A-01</p>
                  <p>Ocupação: 75%</p>
                </TooltipContent>
              </Tooltip>
              <div className="col-start-2 row-start-3 row-span-2 bg-green-500/20 border-2 border-green-500 rounded flex items-center justify-center">
                A-02
              </div>
              <div className="col-start-2 row-start-5 row-span-2 bg-red-500/20 border-2 border-red-500 rounded flex items-center justify-center">
                A-03
              </div>

              <div className="col-start-4 row-span-3 bg-green-500/20 border-2 border-green-500 rounded flex items-center justify-center">
                B-01
              </div>
              <div className="col-start-4 row-start-4 row-span-3 bg-green-500/20 border-2 border-green-500 rounded flex items-center justify-center">
                B-02
              </div>

              {/* Áreas */}
              <div className="col-start-7 col-span-4 row-span-2 bg-blue-500/20 border-2 border-blue-500 rounded flex items-center justify-center">
                Recebimento
              </div>
              <div className="col-start-7 col-span-4 row-start-5 row-span-2 bg-orange-500/20 border-2 border-orange-500 rounded flex items-center justify-center">
                Expedição
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  )
}

export default MapaPage
