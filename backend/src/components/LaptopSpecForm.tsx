import { useState, useEffect } from "react";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  laptopProcessors,
  laptopVGAs,
  laptopRAMs,
  laptopStorages,
  laptopScreens,
  laptopKeyboards,
  laptopOS,
  laptopConditions,
  laptopDefects,
  laptopConnectivity,
  laptopPorts
} from "@/lib/laptopSpecsData";

interface LaptopSpecFormProps {
  value: string;
  onChange: (value: string) => void;
}

export function LaptopSpecForm({ value, onChange }: LaptopSpecFormProps) {
  const [specs, setSpecs] = useState({
    processor: "",
    vga: "",
    ram: "",
    storage: "",
    screen: "",
    keyboard: "",
    os: "",
    condition: "",
    defect: "",
    connectivity: "",
    ports: ""
  });

  useEffect(() => {
    let condStr = specs.condition;
    if (specs.condition === "Minus" && specs.defect) {
        condStr = `Minus (${specs.defect})`;
    }
    const condPart = condStr ? ` | Kondisi: ${condStr}` : "";
    const localSerialized = `Processor: ${specs.processor} | VGA: ${specs.vga} | RAM: ${specs.ram} | Storage: ${specs.storage} | Layar: ${specs.screen} | Keyboard: ${specs.keyboard} | OS: ${specs.os} | Konektivitas: ${specs.connectivity} | Port: ${specs.ports}${condPart}`;

    if (value === "") {
      setSpecs({
        processor: "",
        vga: "",
        ram: "",
        storage: "",
        screen: "",
        keyboard: "",
        os: "",
        condition: "",
        defect: "",
        connectivity: "",
        ports: ""
      });
      return;
    }

    if (value && value !== localSerialized && (value.includes("Processor: ") || value.includes(" | "))) {
      const parts = value.split(" | ");
      const parsed = {
        processor: "",
        vga: "",
        ram: "",
        storage: "",
        screen: "",
        keyboard: "",
        os: "",
        condition: "",
        defect: "",
        connectivity: "",
        ports: ""
      };
      
      parts.forEach(part => {
        if (part.startsWith("Processor: ")) parsed.processor = part.replace("Processor: ", "");
        else if (part.startsWith("VGA: ")) parsed.vga = part.replace("VGA: ", "");
        else if (part.startsWith("RAM: ")) parsed.ram = part.replace("RAM: ", "");
        else if (part.startsWith("Storage: ")) parsed.storage = part.replace("Storage: ", "");
        else if (part.startsWith("Layar: ")) parsed.screen = part.replace("Layar: ", "");
        else if (part.startsWith("Keyboard: ")) parsed.keyboard = part.replace("Keyboard: ", "");
        else if (part.startsWith("OS: ")) parsed.os = part.replace("OS: ", "");
        else if (part.startsWith("Konektivitas: ")) parsed.connectivity = part.replace("Konektivitas: ", "");
        else if (part.startsWith("Port: ")) parsed.ports = part.replace("Port: ", "");
        else if (part.startsWith("Kondisi: ")) {
          const condStr = part.replace("Kondisi: ", "");
          if (condStr.startsWith("Minus (") && condStr.endsWith(")")) {
            parsed.condition = "Minus";
            parsed.defect = condStr.substring(7, condStr.length - 1);
          } else {
            parsed.condition = condStr;
          }
        }
      });
      
      setSpecs(parsed);
    }
  }, [value]);

  const updateSpec = (key: keyof typeof specs, val: string) => {
    const newSpecs = { ...specs, [key]: val };
    setSpecs(newSpecs);
    
    // Create serialized string
    let condStr = newSpecs.condition;
    if (newSpecs.condition === "Minus" && newSpecs.defect) {
        condStr = `Minus (${newSpecs.defect})`;
    }
    const condPart = condStr ? ` | Kondisi: ${condStr}` : "";
    const serialized = `Processor: ${newSpecs.processor} | VGA: ${newSpecs.vga} | RAM: ${newSpecs.ram} | Storage: ${newSpecs.storage} | Layar: ${newSpecs.screen} | Keyboard: ${newSpecs.keyboard} | OS: ${newSpecs.os} | Konektivitas: ${newSpecs.connectivity} | Port: ${newSpecs.ports}${condPart}`;
    onChange(serialized);
  };

  return (
    <div className="p-2 bg-muted/20 border rounded-lg space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Processor */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Processor</label>
          <Autocomplete 
            options={laptopProcessors}
            value={specs.processor}
            onChange={(v) => updateSpec("processor", v)}
            placeholder="Ketik/Pilih Processor..."
            inputClassName="h-8 text-[11px]"
          />
        </div>
        
        {/* VGA */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">VGA / Graphics</label>
          <Autocomplete 
            options={laptopVGAs}
            value={specs.vga}
            onChange={(v) => updateSpec("vga", v)}
            placeholder="Ketik/Pilih VGA..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* RAM */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">RAM</label>
          <Autocomplete 
            options={laptopRAMs}
            value={specs.ram}
            onChange={(v) => updateSpec("ram", v)}
            placeholder="Ketik RAM..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* Storage */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Storage</label>
          <Autocomplete 
            options={laptopStorages}
            value={specs.storage}
            onChange={(v) => updateSpec("storage", v)}
            placeholder="Ketik Storage..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* Layar */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Layar</label>
          <Autocomplete 
            options={laptopScreens}
            value={specs.screen}
            onChange={(v) => updateSpec("screen", v)}
            placeholder="Ketik Layar..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* Keyboard */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Keyboard</label>
          <Autocomplete 
            options={laptopKeyboards}
            value={specs.keyboard}
            onChange={(v) => updateSpec("keyboard", v)}
            placeholder="Ketik Keyboard..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* OS */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Operating System</label>
          <Autocomplete 
            options={laptopOS}
            value={specs.os}
            onChange={(v) => updateSpec("os", v)}
            placeholder="Ketik/Pilih OS..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* Kondisi */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Kondisi Laptop</label>
          <Autocomplete 
            options={laptopConditions}
            value={specs.condition}
            onChange={(v) => updateSpec("condition", v)}
            placeholder="Pilih Kondisi..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* Konektivitas */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Konektivitas</label>
          <Autocomplete 
            options={laptopConnectivity}
            value={specs.connectivity}
            onChange={(v) => updateSpec("connectivity", v)}
            placeholder="Wi-Fi, Bluetooth..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* Port */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium leading-none">Port I/O</label>
          <Autocomplete 
            options={laptopPorts}
            value={specs.ports}
            onChange={(v) => updateSpec("ports", v)}
            placeholder="HDMI, USB, Type-C..."
            inputClassName="h-8 text-[11px]"
          />
        </div>

        {/* Minus */}
        {specs.condition === "Minus" && (
          <div className="space-y-1 col-span-2 md:col-span-4">
            <label className="text-[10px] font-medium leading-none text-destructive">Keterangan Minus</label>
            <Autocomplete 
              options={laptopDefects}
              value={specs.defect}
              onChange={(v) => updateSpec("defect", v)}
              placeholder="Ketik Keterangan Minus (bisa >1)..."
              allowMultiple={true}
              inputClassName="h-8 text-[11px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
