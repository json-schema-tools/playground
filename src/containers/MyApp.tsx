import React, { useState, useEffect } from "react";
import { MuiThemeProvider, AppBar, Toolbar, Typography, IconButton, Tooltip, CssBaseline, Grid, Menu, Button, MenuItem } from "@material-ui/core"; //tslint:disable-line
import useDarkMode from "use-dark-mode";
import Brightness3Icon from "@material-ui/icons/Brightness3";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import CodeIcon from "@material-ui/icons/Code";
import * as monaco from "monaco-editor";
import WbSunnyIcon from "@material-ui/icons/WbSunny";
import { lightTheme, darkTheme } from "../themes/theme";
import { useTranslation } from "react-i18next";
import SplitPane from "react-split-pane";
import Transpiler, { SupportedLanguages } from "@json-schema-tools/transpiler";
import Dereferencer from "@json-schema-tools/dereferencer";
import "./MyApp.css";
import Editor from "@etclabscore/react-monaco-editor";
import { addDiagnostics } from "@etclabscore/monaco-add-json-schema-diagnostics";

const languages: SupportedLanguages[] = ["typescript", "golang", "python", "rust"];

const defaultSchema = {
  title: "example",
  type: "object",
  required: ["thing"],
  properties: {
    thing: {
      title: "bar",
      description: "This is a bar thing",
      type: "string",
      enum: [ "one", "two", "three" ]
    },
    otherThing: {
      description: "generated Title when there is none",
      type: "array",
      items: {
        title: "foo",
        type: "number"
      }
    },
    baz: {
      "$ref": "#/definitions/baz"
    }
  },
  definitions: {
    baz: { type: "number", title: "baz" }
  }
};

const MyApp: React.FC = () => {
  const darkMode = useDarkMode();
  const [, setIsEditorReady] = useState(false);
  const [defaultValue] = useState(JSON.stringify(defaultSchema, undefined, "  "));
  const [value, setValue] = useState(defaultValue);
  const [results, setResults] = useState("");
  const [languageAnchorEl, setLanguageAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedLanguage, setSelectedLanguage]: [SupportedLanguages, any] = useState("typescript");

  useEffect(() => {
    const th = darkMode.value ? "vs-dark" : "vs";
    monaco.editor.setTheme(th);
  }, [darkMode.value]);

  function handleTranspile() {
    try {
      const result = JSON.parse(value);
      const dereffer = new Dereferencer(result);
      dereffer.resolve().then((schema) => {
        const tr = new Transpiler(schema);
        setResults(tr.to(selectedLanguage));
      });
    } catch (e) {
      console.error(e);
    }
  }

  const { t } = useTranslation();
  const theme = darkMode.value ? darkTheme : lightTheme;

  const handleLanguageClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setLanguageAnchorEl(event.currentTarget);
  };
  const handleLanguageClose = () => {
    setLanguageAnchorEl(null);
  };
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setLanguageAnchorEl(null);
  };

  const handleEditorDidMount = async (_: any, editor: any) => {
    setIsEditorReady(true);
    const modelUriString = "inmemory://json-schema-tools-playground.json";
    const modelUri = monaco.Uri.parse(modelUriString);
    const model = monaco.editor.createModel(value || "", "json", modelUri);
    editor.setModel(model);
    const schema = await fetch("https://json-schema.org/draft-07/schema").then((data) => data.json());
    addDiagnostics(modelUri.toString(), schema, monaco);
  };

  const handleReadOnlyEditorDidMount = (editor: any) => {
    // noop
  };

  useEffect(() => {
    handleTranspile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selectedLanguage]);

  return (
    <MuiThemeProvider theme={theme}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Grid container alignContent="center" alignItems="center" justify="flex-start">
            <Typography variant="h6" style={{ paddingRight: "20px" }}>{t("json-schema.tools") as string}</Typography>
            <Typography variant="caption" style={{ paddingRight: "5px" }}>
              {t("playground") as string}
            </Typography>
          </Grid>
          <Grid container alignContent="center" alignItems="center" justify="flex-end">
            {<>
              <Tooltip title={"Language"} >
                <>
                  <Typography variant="body1" style={{ paddingRight: "10px" }}>Language:</Typography>
                  <Button
                    style={{ marginRight: "10px" }}
                    onClick={handleLanguageClick} variant="outlined" endIcon={
                      <ArrowDropDownIcon />
                    }>{selectedLanguage}</Button>
                </>
              </Tooltip>
              <Menu
                id="input-menu"
                anchorEl={languageAnchorEl}
                keepMounted
                open={Boolean(languageAnchorEl)}
                onClose={handleLanguageClose}
              >
                {Object.values(languages).map((language, i) => (
                  <MenuItem onClick={(event) => handleLanguageChange(language)}>{language}</MenuItem>
                ))}
              </Menu>
            </>
            }
            <Tooltip title={t("json-schema.tools Github") as string}>
              <IconButton
                onClick={() =>
                  window.open("https://github.com/json-schema-tools/")
                }>
                <CodeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t("Toggle Dark Mode") as string}>
              <IconButton onClick={darkMode.toggle}>
                {darkMode.value ? <Brightness3Icon /> : <WbSunnyIcon />}
              </IconButton>
            </Tooltip>
          </Grid>
        </Toolbar>
      </AppBar>
      <CssBaseline />
      <SplitPane split="vertical" minSize={100} maxSize={-100} defaultSize={"35%"} style={{ flexGrow: 1 }}>
        <Editor
          height="90vh"
          value={defaultValue}
          onChange={(ev: any, v: string) => {
            setValue(v);
          }}
          editorDidMount={handleEditorDidMount}
          language="json"
        />
        <Editor
          height="90vh"
          editorDidMount={handleReadOnlyEditorDidMount}
          options={{
            minimap: {
              enabled: false,
            },
            wordWrap: "on",
            lineNumbers: "off",
            wrappingIndent: "deepIndent",
            readOnly: true,
            showFoldingControls: "always",
          }}
          value={results}
          language={selectedLanguage}
        />
        <div>
        </div>
      </SplitPane>
    </MuiThemeProvider>
  );
};

export default MyApp;
