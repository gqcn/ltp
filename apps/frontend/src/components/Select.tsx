import ReactSelect, { components, type InputProps, type OptionProps, type SingleValue } from "react-select";
import { cn } from "@/lib/cn";

export type SelectOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

type Variant = "filter" | "form" | "compact";

type Props = {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  title?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function Option(props: OptionProps<SelectOption, false>) {
  return (
    <components.Option {...props}>
      <span data-value={props.data.value}>{props.children}</span>
    </components.Option>
  );
}

function SelectInput(props: InputProps<SelectOption, false> & { describedBy?: string; invalid?: boolean }) {
  const { describedBy, invalid, ...rest } = props;
  return <components.Input {...rest} aria-invalid={invalid} aria-describedby={describedBy} />;
}

export function Select({
  id,
  value,
  options,
  onChange,
  variant = "form",
  className,
  disabled,
  placeholder = "请选择",
  title,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: Props) {
  const selected = options.find((item) => item.value === value) ?? null;

  function handleChange(next: SingleValue<SelectOption>) {
    if (!next) {
      return;
    }
    onChange(next.value);
  }

  return (
    <div className={cn("ltp-select", `ltp-select--${variant}`, className)} data-value={value} title={title}>
      <ReactSelect<SelectOption, false>
        inputId={id}
        instanceId={id}
        unstyled
        classNamePrefix="ltp-select"
        isSearchable
        isClearable={false}
        backspaceRemovesValue={false}
        isDisabled={disabled}
        placeholder={placeholder}
        noOptionsMessage={() => "无匹配选项"}
        options={options}
        value={selected}
        onChange={handleChange}
        aria-label={ariaLabel}
        menuPortalTarget={typeof document === "undefined" ? undefined : document.body}
        menuPosition="fixed"
        maxMenuHeight={280}
        styles={{
          menuPortal: (base) => {
            const controlWidth = typeof base.width === "number" ? base.width : 0;
            return {
              ...base,
              zIndex: 1100,
              width: "max-content",
              minWidth: controlWidth,
              maxWidth: Math.max(controlWidth, 280),
            };
          },
          menu: (base) => ({
            ...base,
            width: "max-content",
            minWidth: "inherit",
            maxWidth: "inherit",
          }),
        }}
        filterOption={(option, input) => {
          if (option.data.isDisabled) {
            return !input;
          }
          return option.label.toLowerCase().includes(input.trim().toLowerCase());
        }}
        components={{
          Option,
          IndicatorSeparator: () => null,
          DropdownIndicator: () => null,
          Input: (inputProps) => <SelectInput {...inputProps} describedBy={ariaDescribedBy} invalid={ariaInvalid} />,
        }}
      />
    </div>
  );
}
